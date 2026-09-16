import { SectionTitle } from "@/components/public/section-title";
import { Timeline } from "@/components/public/timeline";
import { EMBAIXADORES_DO_REI, HISTORIA_ER } from "@/lib/content/institucional";

export function EmbaixadoresDoReiSecao() {
  return (
    <section id="embaixadores-do-rei" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>A Organização Embaixadores do Rei</SectionTitle>

        <div className="mt-12 space-y-4">
          <p className="text-measure leading-relaxed text-text">{EMBAIXADORES_DO_REI.introducao}</p>

          <div className="mt-6 rounded-lg border border-border border-l-4 border-l-accent bg-surface-2 p-5">
            <p className="text-text">
              <strong className="text-primary">Tema:</strong> &ldquo;{EMBAIXADORES_DO_REI.tema}&rdquo;
            </p>
            <p className="mt-2 text-text">
              <strong className="text-primary">Divisa:</strong> &ldquo;{EMBAIXADORES_DO_REI.divisa}&rdquo;
            </p>
          </div>

          <h4 className="pt-4 font-semibold text-primary">{EMBAIXADORES_DO_REI.tituloIdentidade}</h4>
          <dl className="space-y-3 text-text">
            {EMBAIXADORES_DO_REI.identidade.map((item) => (
              <div key={item.termo}>
                <dt className="font-medium text-primary">{item.termo}</dt>
                <dd>{item.definicao}</dd>
              </div>
            ))}
          </dl>

          <h4 className="pt-2 font-semibold text-primary">{EMBAIXADORES_DO_REI.tituloIdeais}</h4>
          <ul className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2 p-4 text-text sm:grid-cols-3">
            {EMBAIXADORES_DO_REI.cincoIdeais.map((ideal) => (
              <li key={ideal} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                {ideal}
              </li>
            ))}
          </ul>
        </div>

        <h4 className="mt-12 mb-8 pt-2 font-semibold text-primary">{EMBAIXADORES_DO_REI.tituloHistoria}</h4>
        <Timeline items={HISTORIA_ER} />
      </div>
    </section>
  );
}
