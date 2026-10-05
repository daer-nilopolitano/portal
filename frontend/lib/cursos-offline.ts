// Cursos offline: baixa as páginas e imagens de um curso para o Cache Storage do navegador, sob demanda.
// O service worker (public/sw.js) já procura nesses caches quando não há internet. Roda só no navegador.

/** Descrição do que baixar de um curso; montada no servidor em app/cursos/_lib/offline.ts. */
export interface PacoteOffline {
  slug: string;
  titulo: string;
  /** Páginas do curso (índice, sumário e capítulos). */
  paginas: string[];
  /** Imagens usadas nos capítulos (somente as da própria origem). */
  imagens: string[];
  /** Estimativa em bytes, só para avisar antes de baixar; o tamanho real é medido depois. */
  bytesEstimados: number;
  /** Muda quando o conteúdo do curso muda; serve para avisar que há atualização. */
  versao: string;
}

export interface MetaCurso {
  bytes: number;
  versao: string;
  em: number;
}

interface Meta {
  /** Tamanho dos arquivos do app (JS/CSS/fontes) compartilhados entre os cursos baixados. */
  comum: number;
  cursos: Record<string, MetaCurso>;
}

export interface Progresso {
  feitos: number;
  total: number;
}

const CACHE_COMUM = "daer-cursos-comum";
const CHAVE_META = "daer_cursos_offline";
const EVENTO_MUDOU = "daer-cursos-offline-mudou";

// O prefixo "daer-cursos-" é preservado pelo service worker na limpeza de caches antigos.
const nomeCacheCurso = (slug: string) => `daer-cursos-c-${slug}`;

export function suportaCursosOffline(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

export function lerMeta(): Meta {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE_META) ?? "null");
    if (dados && typeof dados.comum === "number" && dados.cursos && typeof dados.cursos === "object") {
      return dados as Meta;
    }
  } catch {
    // armazenamento indisponível ou conteúdo inválido: recomeça vazio
  }
  return { comum: 0, cursos: {} };
}

function salvarMeta(meta: Meta) {
  try {
    localStorage.setItem(CHAVE_META, JSON.stringify(meta));
  } catch {
    // sem armazenamento: o download funciona, só o tamanho não fica registrado
  }
  window.dispatchEvent(new Event(EVENTO_MUDOU));
}

/** Avisa quando algum curso foi baixado ou removido (para atualizar telas diferentes ao mesmo tempo). */
export function aoMudarCursosOffline(callback: () => void): () => void {
  window.addEventListener(EVENTO_MUDOU, callback);
  return () => window.removeEventListener(EVENTO_MUDOU, callback);
}

/** Situação do curso neste aparelho. Se o cache sumiu (ex.: limpeza do Android), apaga o registro e devolve null. */
export async function estadoDoCurso(slug: string): Promise<MetaCurso | null> {
  const meta = lerMeta();
  const registro = meta.cursos[slug] ?? null;
  const existe = await caches.has(nomeCacheCurso(slug));
  if (registro && !existe) {
    delete meta.cursos[slug];
    salvarMeta(meta);
    return null;
  }
  return existe ? registro : null;
}

async function tamanhoDoCache(nome: string): Promise<number> {
  if (!(await caches.has(nome))) return 0;
  const cache = await caches.open(nome);
  let total = 0;
  for (const requisicao of await cache.keys()) {
    const resposta = await cache.match(requisicao);
    if (resposta) total += (await resposta.blob()).size;
  }
  return total;
}

// Arquivos do Next citados nas páginas (nas tags e na carga de dados), com o nome já com hash — nunca mudam.
// Ex.: static/chunks/app/cursos/%5Bcurso%5D/page-abc.js, static/css/abc.css, static/media/abc.woff2
const REGEX_ESTATICOS = /\bstatic\/(?:chunks|css|media)\/[A-Za-z0-9_\-./%[\]]+?\.(?:js|css|woff2?)\b/g;
const REGEX_URL_NO_CSS = /url\(\s*["']?([^)"'\s]+)/g;

function normalizarEstatico(achado: string): string {
  return `/_next/${achado}`.replace(/\[/g, "%5B").replace(/\]/g, "%5D");
}

type Tipo = "html" | "css" | "arquivo";
interface Item {
  url: string;
  destino: Cache;
  tipo: Tipo;
}

const SIMULTANEOS = 4;

function erroDeCancelamento() {
  return new DOMException("Download cancelado", "AbortError");
}

/**
 * Baixa o curso. Páginas e imagens vão para o cache do curso; JS, CSS e fontes do app vão para um cache comum
 * (compartilhado entre os cursos). Se falhar no primeiro download, não deixa nada pela metade.
 */
export async function baixarCurso(
  pacote: PacoteOffline,
  opcoes: { sinal?: AbortSignal; aoProgresso?: (progresso: Progresso) => void } = {},
): Promise<void> {
  const { aoProgresso } = opcoes;
  // Sinal interno: cancela os outros downloads em andamento assim que um falha (ou a pessoa cancela).
  const interno = new AbortController();
  opcoes.sinal?.addEventListener("abort", () => interno.abort());
  if (opcoes.sinal?.aborted) interno.abort();
  const sinal = interno.signal;
  const nome = nomeCacheCurso(pacote.slug);
  const jaExistia = await caches.has(nome);
  const cacheCurso = await caches.open(nome);
  const cacheComum = await caches.open(CACHE_COMUM);

  // Pede ao navegador para não apagar estes dados por falta de espaço (é só um pedido; pode ser negado).
  navigator.storage?.persist?.().catch(() => {});

  const fila: Item[] = [];
  const vistos = new Set<string>();
  const doCurso = new Set<string>();
  let feitos = 0;

  function enfileirar(url: string, destino: Cache, tipo: Tipo) {
    if (vistos.has(url)) return;
    vistos.add(url);
    if (destino === cacheCurso) doCurso.add(url);
    fila.push({ url, destino, tipo });
  }

  function descobrirEstaticos(texto: string, tipo: Tipo) {
    if (tipo === "html") {
      for (const achado of texto.match(REGEX_ESTATICOS) ?? []) {
        const url = normalizarEstatico(achado);
        enfileirar(url, cacheComum, url.endsWith(".css") ? "css" : "arquivo");
      }
    }
  }

  async function processar({ url, destino, tipo }: Item, urlBaseCss?: string) {
    // Arquivo com hash no nome é imutável: se já está no cache comum (de outro curso), não baixa de novo.
    if (destino === cacheComum && (await cacheComum.match(url))) return;

    const resposta = await fetch(url, { cache: tipo === "html" ? "reload" : "default", signal: sinal });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);

    const texto = tipo === "arquivo" ? null : await resposta.clone().text();
    await destino.put(url, resposta);
    if (texto === null) return;

    if (tipo === "html") {
      descobrirEstaticos(texto, tipo);
    } else {
      // CSS: pega as fontes citadas em url(...)
      for (const achado of texto.matchAll(REGEX_URL_NO_CSS)) {
        const alvo = new URL(achado[1], new URL(urlBaseCss ?? url, location.origin));
        if (alvo.origin === location.origin && alvo.pathname.startsWith("/_next/static/")) {
          enfileirar(alvo.pathname, cacheComum, "arquivo");
        }
      }
    }
  }

  pacote.paginas.forEach((url) => enfileirar(url, cacheCurso, "html"));
  pacote.imagens.forEach((url) => enfileirar(url, cacheCurso, "arquivo"));
  aoProgresso?.({ feitos, total: vistos.size });

  let ativos = 0;
  async function trabalhador() {
    for (;;) {
      if (sinal.aborted) throw erroDeCancelamento();
      const item = fila.shift();
      if (!item) {
        if (ativos === 0) return;
        // Fila vazia, mas outro trabalhador pode estar descobrindo mais arquivos numa página: espera um instante.
        await new Promise((resolver) => setTimeout(resolver, 25));
        continue;
      }
      ativos += 1;
      try {
        await processar(item, item.tipo === "css" ? item.url : undefined);
      } finally {
        ativos -= 1;
      }
      feitos += 1;
      aoProgresso?.({ feitos, total: vistos.size });
    }
  }

  const resultados = await Promise.allSettled(
    Array.from({ length: SIMULTANEOS }, () =>
      trabalhador().catch((erro) => {
        interno.abort();
        throw erro;
      }),
    ),
  );
  const falhas = resultados.filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => r.reason);
  if (falhas.length > 0) {
    if (!jaExistia) await caches.delete(nome); // não deixa um curso "meio baixado"
    // Mostra o erro de verdade, e não o "cancelado" que ele provocou nos outros trabalhadores.
    const causa = falhas.find((f) => !(f instanceof DOMException && f.name === "AbortError"));
    throw causa ?? falhas[0];
  }

  // Atualização: tira do cache do curso o que o curso não usa mais (ex.: imagem trocada).
  if (jaExistia) {
    for (const requisicao of await cacheCurso.keys()) {
      if (!doCurso.has(new URL(requisicao.url).pathname)) await cacheCurso.delete(requisicao);
    }
  }

  const meta = lerMeta();
  meta.cursos[pacote.slug] = { bytes: await tamanhoDoCache(nome), versao: pacote.versao, em: Date.now() };
  meta.comum = await tamanhoDoCache(CACHE_COMUM);
  salvarMeta(meta);
}

export async function removerCurso(slug: string): Promise<void> {
  await caches.delete(nomeCacheCurso(slug));
  const meta = lerMeta();
  delete meta.cursos[slug];
  if (Object.keys(meta.cursos).length === 0) {
    await caches.delete(CACHE_COMUM);
    meta.comum = 0;
  } else {
    meta.comum = await tamanhoDoCache(CACHE_COMUM);
  }
  salvarMeta(meta);
}

/** Total ocupado por todos os cursos baixados (inclui os arquivos comuns do app). */
export function totalOcupado(): number {
  const meta = lerMeta();
  const cursos = Object.values(meta.cursos);
  return cursos.length === 0 ? 0 : cursos.reduce((soma, c) => soma + c.bytes, meta.comum);
}

export function formatarBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
