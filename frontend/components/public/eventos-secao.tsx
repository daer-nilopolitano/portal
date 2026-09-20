import { SectionTitle } from "@/components/public/section-title";
import { Timeline } from "@/components/public/timeline";
import { EVENTOS } from "@/lib/content/institucional";
import { getCronogramaEventos } from "@/lib/eventos";

export async function EventosSecao() {
  const cronograma = await getCronogramaEventos();

  return (
    <section id="eventos" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>Cronograma de Eventos</SectionTitle>
        <p className="mt-4 text-center text-text-muted">{EVENTOS.descricao}</p>
        {cronograma.length > 0 ? (
          <Timeline items={cronograma} className="mt-12" />
        ) : (
          <p className="mt-12 text-center text-sm text-text-muted">
            Nenhum evento cadastrado no momento.
          </p>
        )}
      </div>
    </section>
  );
}
