import { SectionTitle } from "@/components/public/section-title";
import { Timeline } from "@/components/public/timeline";
import { CRONOGRAMA_EVENTOS, EVENTOS } from "@/lib/content/institucional";

export function EventosSecao() {
  return (
    <section id="eventos" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>Cronograma de Eventos</SectionTitle>
        <p className="mt-4 text-center text-text-muted">{EVENTOS.descricao}</p>
        <Timeline items={CRONOGRAMA_EVENTOS} className="mt-12" />
      </div>
    </section>
  );
}
