/**
 * Utilitários do cache de dados do painel (SWR). Ficam num arquivo próprio,
 * sem depender do contexto de autenticação, para o auth-context poder
 * limpar o cache no login/logout sem criar import circular.
 */
import { mutate } from "swr";

/**
 * Marca tudo como desatualizado e recarrega o que está na tela agora.
 * Chame depois de criar/editar/excluir algo: as outras telas (contadores do
 * painel, listas que se cruzam) também refazem a busca na próxima visita, em
 * vez de mostrar o dado antigo do cache.
 */
export function revalidarTudo() {
  return mutate(() => true);
}

/** Esvazia o cache — usado no login e no logout. */
export function limparCache() {
  return mutate(() => true, undefined, { revalidate: false });
}
