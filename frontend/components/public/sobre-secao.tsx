import { SectionTitle } from "@/components/public/section-title";
import { SOBRE } from "@/lib/content/institucional";

export function SobreSecao() {
  return (
    <section id="sobre" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>Quem Somos</SectionTitle>

        <div className="mt-12 space-y-4">
          <h3 className="text-xl font-semibold text-primary">{SOBRE.tituloPrincipal}</h3>
          {SOBRE.paragrafos.map((paragrafo) => (
            <p key={paragrafo} className="text-measure leading-relaxed text-text">
              {paragrafo}
            </p>
          ))}

          <h4 className="pt-2 font-semibold text-primary">{SOBRE.tituloAtividades}</h4>
          <ul className="space-y-2 text-text">
            {SOBRE.atividades.map((atividade) => (
              <li key={atividade.titulo}>
                <strong className="text-primary">{atividade.titulo}</strong> {atividade.texto}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
