// Carteirinha digital no aparelho: guarda a última carteirinha carregada (dados + foto reduzida) no localStorage,
// para ela abrir mesmo sem internet. É apagada no logout (ver auth-context). Roda só no navegador.
import { mediaUrl } from "@/lib/api";

/** Resposta de GET /carteirinhas/me/. */
export interface CarteirinhaMe {
  id: number;
  membro_nome: string;
  foto_url: string | null;
  embaixada_nome: string;
  posto: string | null;
  faixa_etaria: string | null;
  identificador: string;
  validade: string;
  emitida_em: string;
}

export interface CarteirinhaSalva {
  /** Dono da carteirinha: uma cópia de outra conta nunca é mostrada. */
  membroId: number;
  dados: CarteirinhaMe;
  /** Foto já reduzida, como data URL (pode ser exibida sem rede). */
  fotoDataUrl: string | null;
  /** `foto_url` da qual `fotoDataUrl` veio; se a foto mudar, ela é baixada de novo. */
  fotoOrigem: string | null;
  salvoEm: number;
}

const CHAVE = "daer_carteirinha";
const LARGURA_FOTO = 256; // tamanho que o otimizador do Next já aceita; a foto aparece com 112px (224px em telas 2x)
const LIMITE_FOTO_BYTES = 300 * 1024; // cota do localStorage é pequena (~5 MB): foto grande não entra

function ler(): CarteirinhaSalva | null {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    const valido =
      dados &&
      typeof dados.membroId === "number" &&
      dados.dados &&
      typeof dados.dados.identificador === "string" &&
      typeof dados.dados.membro_nome === "string";
    return valido ? (dados as CarteirinhaSalva) : null;
  } catch {
    return null;
  }
}

function gravar(carteirinha: CarteirinhaSalva) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(carteirinha));
  } catch {
    // armazenamento cheio ou bloqueado: a carteirinha continua funcionando online, só não abre offline
  }
}

export function lerCarteirinhaSalva(membroId: number): CarteirinhaSalva | null {
  const salva = ler();
  return salva && salva.membroId === membroId ? salva : null;
}

export function esquecerCarteirinha() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = () => rejeitar(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

async function baixarFoto(fotoUrl: string): Promise<string | null> {
  const origem = mediaUrl(fotoUrl);
  if (!origem) return null;
  try {
    // Pelo otimizador de imagens do próprio Next: mesma origem (sem CORS) e já reduzida.
    const resposta = await fetch(`/_next/image?url=${encodeURIComponent(origem)}&w=${LARGURA_FOTO}&q=75`);
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    if (!blob.type.startsWith("image/") || blob.size > LIMITE_FOTO_BYTES) return null;
    return await blobParaDataUrl(blob);
  } catch {
    return null; // sem rede ou foto indisponível: fica só a inicial do nome
  }
}

/**
 * Guarda a carteirinha recém-carregada. Os dados são salvos na hora; a foto vem depois (só se for nova ou tiver
 * mudado) e atualiza a cópia. Devolve a cópia final.
 */
export async function guardarCarteirinha(membroId: number, dados: CarteirinhaMe): Promise<CarteirinhaSalva> {
  const anterior = lerCarteirinhaSalva(membroId);
  const salva: CarteirinhaSalva = {
    membroId,
    dados,
    fotoDataUrl: anterior && anterior.fotoOrigem === dados.foto_url ? anterior.fotoDataUrl : null,
    fotoOrigem: dados.foto_url,
    salvoEm: Date.now(),
  };
  gravar(salva);
  if (!dados.foto_url || salva.fotoDataUrl) return salva;

  const foto = await baixarFoto(dados.foto_url);
  if (!foto) return salva;

  // Confere se nada mudou enquanto a foto baixava (logout, troca de conta, outra foto).
  const atual = lerCarteirinhaSalva(membroId);
  if (!atual || atual.dados.foto_url !== dados.foto_url) return salva;
  const comFoto = { ...atual, fotoDataUrl: foto };
  gravar(comFoto);
  return comFoto;
}
