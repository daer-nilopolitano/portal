import { SectionTitle } from "@/components/public/section-title";
import { Timeline, type TimelineItem } from "@/components/public/timeline";

const CRONOGRAMA: TimelineItem[] = [
  {
    rotulo: "Julho",
    data: "11 de julho",
    texto: "Conclave dos Embaixadores do Rei na PIB de Olinda.",
  },
  {
    rotulo: "Agosto",
    data: "22 de agosto",
    texto: "Programação especial em alusão ao início do ER no Brasil (local a definir).",
  },
  {
    rotulo: "Setembro",
    data: "12 de setembro",
    texto: "Conclave dos Embaixadores do Rei na IB Quinze de Novembro.",
  },
  {
    rotulo: "Outubro",
    data: "17 de outubro",
    texto: "Intercâmbio na Igreja Batista Videira em Nilópolis.",
  },
  {
    rotulo: "Novembro",
    data: "07 de novembro",
    texto: "Mutirão evangelístico em cooperação com outros DAERs na PIB de Vila Norma.",
  },
];

export function EventosSecao() {
  return (
    <section id="eventos" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>Cronograma de Eventos</SectionTitle>
        <p className="mt-4 text-center text-text-muted">
          Agenda de atividades do DAER Nilopolitano para o 2º semestre de 2026.
        </p>
        <Timeline items={CRONOGRAMA} className="mt-12" />
      </div>
    </section>
  );
}
