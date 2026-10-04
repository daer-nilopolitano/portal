import { getFromApi } from "@/lib/api";
import type { EmbaixadaDestaque, EmbaixadaPublica, Igreja } from "@/lib/types";

/**
 * Embaixadas com os dados da igreja que as sedia, para a home e a página /embaixadas (uso em servidor).
 * Junta /igrejas/ e /embaixadas-publicas/ por igreja_id — só entram igrejas que já têm embaixada cadastrada
 * (relação 1:1, então cada igreja aparece no máximo uma vez).
 */
export async function listarEmbaixadasDestaque(): Promise<EmbaixadaDestaque[]> {
  const [igrejas, embaixadas] = await Promise.all([
    getFromApi<Igreja[]>("/igrejas/", { revalidate: 60 }).catch(() => []),
    getFromApi<EmbaixadaPublica[]>("/embaixadas-publicas/", { revalidate: 60 }).catch(() => []),
  ]);

  return igrejas.flatMap((igreja) => {
    const embaixada = embaixadas.find((e) => e.igreja_id === igreja.id);
    if (!embaixada) return [];
    return [
      {
        ...igreja,
        embaixada_id: embaixada.id,
        embaixada_nome: embaixada.nome,
        conselheiros_nomes: embaixada.conselheiros_nomes,
        horarios_reuniao: embaixada.horarios_reuniao,
      },
    ];
  });
}
