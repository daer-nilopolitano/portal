/*
 * Service worker do DAER Nilopolitano.
 *
 * O que ele faz:
 *  - guarda o "esqueleto" do app (arquivos estáticos e páginas já visitadas) para abrir mesmo sem internet;
 *  - sem internet e sem a página no cache, mostra /offline.html.
 *
 * O que ele NÃO faz (de propósito):
 *  - não toca na API: ela fica em outro domínio e leva o token (JWT) — nenhum dado de membro passa por aqui;
 *  - só trata requisições GET da mesma origem.
 *
 * Cursos baixados para leitura offline (caches `daer-cursos-*`, criados pelo próprio app) são procurados em
 * todos os caches e nunca apagados na limpeza de versões antigas.
 *
 * Atualização: uma versão nova fica "esperando" até a pessoa tocar em "Atualizar" no aviso do app
 * (que envia PULAR_ESPERA). Se mudar a estratégia de cache, aumente VERSAO para limpar os caches antigos.
 */

const VERSAO = "v1";
const CACHE_BASE = `daer-base-${VERSAO}`; // pré-cache: página offline e logos (nunca é podado)
const CACHE_PAGINAS = `daer-paginas-${VERSAO}`; // HTML das páginas visitadas
const CACHE_NEXT = `daer-next-${VERSAO}`; // /_next/static/* (arquivos com hash no nome, imutáveis)
const CACHE_ARQUIVOS = `daer-arquivos-${VERSAO}`; // imagens, fontes, css e js de /public
const CACHES_ATUAIS = [CACHE_BASE, CACHE_PAGINAS, CACHE_NEXT, CACHE_ARQUIVOS];

const PAGINA_OFFLINE = "/offline.html";
const PRE_CACHE = [PAGINA_OFFLINE, "/logo-daer.png", "/logo.png", "/android-chrome-192x192.png"];

const MAX_PAGINAS = 40;
const MAX_NEXT = 300;
const MAX_ARQUIVOS = 150;

const ARQUIVO_ESTATICO = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|css|js)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_BASE);
      // allSettled: um arquivo ausente não pode impedir a instalação do service worker.
      await Promise.allSettled(PRE_CACHE.map((url) => cache.add(url)));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((nome) => nome.startsWith("daer-") && !nome.startsWith("daer-cursos-") && !CACHES_ATUAIS.includes(nome))
          .map((nome) => caches.delete(nome)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.tipo === "PULAR_ESPERA") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API, tiles do mapa, mídia do R2...
  if (url.pathname === "/sw.js" || url.pathname.startsWith("/api/")) return;
  if (req.headers.has("RSC") || url.searchParams.has("_rsc")) return; // navegação interna do Next: ele cuida

  if (req.mode === "navigate") {
    event.respondWith(paginaRedePrimeiro(req));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cachePrimeiro(req, CACHE_NEXT, MAX_NEXT));
  } else if (url.pathname.startsWith("/_next/")) {
    return; // otimizador de imagens e dados do Next: segue direto para a rede
  } else if (ARQUIVO_ESTATICO.test(url.pathname)) {
    event.respondWith(velhoEnquantoAtualiza(event, req, CACHE_ARQUIVOS, MAX_ARQUIVOS));
  }
});

// Páginas: rede primeiro (sempre a versão mais nova quando há internet); sem rede, a última visitada; senão, /offline.html.
// Se já existe uma cópia (ex.: curso baixado), a rede tem 4s: sinal ruim não deve prender a pessoa numa tela em branco.
const ESPERA_DA_REDE_COM_COPIA_MS = 4000;

function comLimite(promessa, ms) {
  return new Promise((resolve, reject) => {
    const tempo = setTimeout(() => reject(new Error("tempo esgotado")), ms);
    promessa.then(
      (valor) => {
        clearTimeout(tempo);
        resolve(valor);
      },
      (erro) => {
        clearTimeout(tempo);
        reject(erro);
      },
    );
  });
}

async function paginaRedePrimeiro(req) {
  const copia = await caches.match(req, { ignoreVary: true });
  try {
    const resposta = copia ? await comLimite(fetch(req), ESPERA_DA_REDE_COM_COPIA_MS) : await fetch(req);
    if (resposta.status === 200 && resposta.type === "basic" && !resposta.redirected) {
      const cache = await caches.open(CACHE_PAGINAS);
      await cache.put(req, resposta.clone());
      await limitar(cache, MAX_PAGINAS);
      return resposta;
    }
    if (resposta.status >= 500 && copia) return copia;
    return resposta;
  } catch {
    return copia || (await caches.match(PAGINA_OFFLINE)) || Response.error();
  }
}

// Arquivos com hash no nome nunca mudam: se está no cache, usa.
async function cachePrimeiro(req, nome, max) {
  const cache = await caches.open(nome);
  const guardada = (await cache.match(req)) || (await caches.match(req)); // também nos caches dos cursos baixados
  if (guardada) return guardada;
  const resposta = await fetch(req);
  if (resposta.status === 200) {
    await cache.put(req, resposta.clone());
    await limitar(cache, max);
  }
  return resposta;
}

// Arquivos de /public (logos, ícones): responde o do cache na hora e atualiza em segundo plano.
async function velhoEnquantoAtualiza(event, req, nome, max) {
  const cache = await caches.open(nome);
  const guardada = (await cache.match(req)) || (await caches.match(req)); // também nos caches dos cursos baixados
  const daRede = fetch(req)
    .then(async (resposta) => {
      if (resposta.status === 200) {
        await cache.put(req, resposta.clone());
        await limitar(cache, max);
      }
      return resposta;
    })
    .catch(() => null);
  if (guardada) {
    event.waitUntil(daRede);
    return guardada;
  }
  return (await daRede) || Response.error();
}

// Mantém só as `max` entradas mais recentes (as chaves vêm na ordem em que foram guardadas).
async function limitar(cache, max) {
  const chaves = await cache.keys();
  if (chaves.length > max) {
    await Promise.all(chaves.slice(0, chaves.length - max).map((chave) => cache.delete(chave)));
  }
}
