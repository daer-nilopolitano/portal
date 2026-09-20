"use client";

/**
 * GET autenticado com cache no cliente (SWR, padrão "stale-while-revalidate").
 *
 * Ao voltar para uma tela já visitada, os dados guardados aparecem na hora e
 * a página só atualiza em segundo plano — em vez de refazer todas as chamadas
 * do zero a cada troca de seção. Chamadas com o mesmo caminho compartilham o
 * cache entre telas (ex.: "/embaixadas/" no painel e na tela de embaixadas).
 *
 * Uso:
 *   const { data, isLoading, error } = useApi<Embaixada[]>("/embaixadas/");
 *   const { data: igrejas } = useApi<Igreja[]>(ehDiretoria ? "/igrejas/" : null);
 *
 * Depois de criar/editar/excluir, chame `await revalidarTudo()`.
 */
import useSWR, { type SWRConfiguration } from "swr";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export { revalidarTudo, limparCache } from "@/lib/cache";

const OPCOES_PADRAO: SWRConfiguration = {
  revalidateOnFocus: false, // não refaz tudo só porque a aba ganhou foco
  shouldRetryOnError: false, // 404 (ex.: carteirinha não emitida) não deve ficar em loop
  dedupingInterval: 30_000, // chamadas iguais em até 30 s reaproveitam o resultado
};

/**
 * `path = null` desliga a busca (útil para chamadas condicionais). O cache é
 * esvaziado no login e no logout (ver auth-context), então a chave pode ser
 * só o caminho.
 */
export function useApi<T>(path: string | null, opcoes?: SWRConfiguration) {
  const { token } = useAuth();
  return useSWR<T>(
    token && path ? path : null,
    (caminho: string) => apiFetch<T>(caminho, { token }),
    { ...OPCOES_PADRAO, ...opcoes }
  );
}
