import { SectionTitle } from "@/components/public/section-title";

export function SobreSecao() {
  return (
    <section id="sobre" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>Quem Somos</SectionTitle>

        <div className="mt-12 space-y-4">
          <h3 className="text-xl font-semibold text-primary">O DAER Nilopolitano</h3>
          <p className="text-measure leading-relaxed text-text">
            O Departamento Associacional de Embaixadores do Rei (DAER) Nilopolitano é o
            órgão responsável por apoiar, orientar e fortalecer as embaixadas vinculadas
            às igrejas da Associação Batista Nilopolitana.
          </p>
          <p className="text-measure leading-relaxed text-text">
            Nossa missão é caminhar ao lado das igrejas locais, oferecendo o suporte
            necessário para que a organização Embaixadores do Rei cumpra seu papel
            transformador na vida dos meninos e jovens de Nilópolis.
          </p>

          <h4 className="pt-2 font-semibold text-primary">O que fazemos:</h4>
          <ul className="space-y-2 text-text">
            <li>
              <strong className="text-primary">Eventos Associacionais:</strong>{" "}
              Promovemos torneios, conclaves, congressos, mutirões evangelísticos e
              encontros que integram as embaixadas de Nilópolis.
            </li>
            <li>
              <strong className="text-primary">Treinamento e Suporte:</strong>{" "}
              Orientações, treinamentos e suporte prático para conselheiros e líderes
              locais.
            </li>
            <li>
              <strong className="text-primary">Expansão:</strong> Auxiliamos igrejas
              locais na fundação e estruturação de novas embaixadas.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
