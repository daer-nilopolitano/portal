// Utilidades do PWA usadas fora dos componentes de instalação.

/**
 * Apaga as páginas guardadas pelo service worker (cache `daer-paginas-*`). Chamado ao sair da conta, para o aparelho
 * não manter cópias de telas visitadas por quem estava logado. Os arquivos estáticos (JS, CSS, logos) ficam.
 */
export function limparCachesDePaginas() {
  if (typeof window === "undefined" || !("caches" in window)) return;
  caches
    .keys()
    .then((nomes) => Promise.all(nomes.filter((nome) => nome.startsWith("daer-paginas-")).map((nome) => caches.delete(nome))))
    .catch(() => {
      // sem permissão de cache (modo privado, por exemplo): nada a limpar
    });
}
