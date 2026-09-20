import { EmbaixadasDestaques } from "@/components/public/embaixadas/destaques";
import { SectionTitle } from "@/components/public/section-title";
import { getFromApi } from "@/lib/api";
import type { Igreja, EmbaixadaPublica, EmbaixadaDestaque } from "@/lib/types";

export async function EmbaixadasSecao() {
  const [igrejas, embaixadas] = await Promise.all([
    getFromApi<Igreja[]>("/igrejas/", { revalidate: 60 }).catch(() => []),
    getFromApi<EmbaixadaPublica[]>("/embaixadas-publicas/", { revalidate: 60 }).catch(() => []),
  ]);

  // Junta os dois por igreja_id — só entram igrejas que já têm embaixada
  // cadastrada (relação é 1:1, então cada igreja aparece no máximo uma vez).
  const destaques: EmbaixadaDestaque[] = igrejas.flatMap((igreja) => {
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

  return (
    <section id="embaixadas" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionTitle>Embaixadas Nilopolitanas</SectionTitle>
        <p className="mt-4 text-center text-text-muted">
          Conheça as igrejas que sediam nossas embaixadas e encontre a mais próxima de você.
        </p>
        <EmbaixadasDestaques igrejas={destaques} />
      </div>
    </section>
  );
}
