import { SectionTitle } from "@/components/public/section-title";
import { Timeline, type TimelineItem } from "@/components/public/timeline";

const HISTORIA: TimelineItem[] = [
  {
    data: "1883",
    texto:
      "Um grupo de meninos entre 12 e 14 anos começa a se reunir para estudar e orar por missões nos Estados Unidos.",
  },
  {
    data: "1908",
    texto:
      "A União Feminina Missionária da Convenção Batista do Sul dos EUA oficializa e institucionaliza a organização.",
  },
  {
    data: "25 de Agosto de 1948",
    texto:
      "O missionário estadunidense William Alvin Hatton organiza a primeira embaixada em solo brasileiro (Embaixada William Buck Bagby), na Igreja Batista da Tijuca (atual Primeira Igreja Batista do Andaraí, no Rio de Janeiro).",
  },
  {
    data: "1978",
    texto:
      "É criada a União de Homens Batistas do Brasil, que assume a responsabilidade de promover e gerenciar a organização Embaixadores do Rei em todo o país.",
  },
];

export function EmbaixadoresDoReiSecao() {
  return (
    <section id="embaixadores-do-rei" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>A Organização Embaixadores do Rei</SectionTitle>

        <div className="mt-12 space-y-4">
          <p className="text-measure leading-relaxed text-text">
            Os Embaixadores do Rei (ER) é uma organização missionária das Igrejas
            Batistas voltada para meninos de 9 a 17 anos. O objetivo central é promover
            o desenvolvimento físico, moral e espiritual dos garotos, preparando-os para
            servirem a Deus e à sociedade.
          </p>

          <div className="mt-6 rounded-lg border border-border border-l-4 border-l-accent bg-surface-2 p-5">
            <p className="text-text">
              <strong className="text-primary">Tema:</strong> &ldquo;Somos Embaixadores
              por Cristo&rdquo;
            </p>
            <p className="mt-2 text-text">
              <strong className="text-primary">Divisa:</strong> &ldquo;De sorte que
              somos embaixadores por Cristo, como se Deus por nós vos exortasse.
              Rogamo-vos, pois, por Cristo que vos reconcilieis com Deus.&rdquo; (II
              Coríntios 5:20)
            </p>
          </div>

          <h4 className="pt-4 font-semibold text-primary">Identidade e Requisitos:</h4>
          <dl className="space-y-3 text-text">
            <div>
              <dt className="font-medium text-primary">Significado</dt>
              <dd>
                Um embaixador representa seu governo em outro país; o Embaixador do Rei
                representa Jesus Cristo aqui na terra.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-primary">Cores</dt>
              <dd>Azul, Branco e Amarelo</dd>
            </div>
            <div>
              <dt className="font-medium text-primary">Hino Oficial</dt>
              <dd>Firmando Propósitos</dd>
            </div>
            <div>
              <dt className="font-medium text-primary">Requisitos Mínimos</dt>
              <dd>
                Para ser membro de uma embaixada, o menino deve saber o significado do
                nome, tema, divisa, compromisso e o hino oficial.
              </dd>
            </div>
          </dl>

          <h4 className="pt-2 font-semibold text-primary">Os 5 Ideais do Embaixador:</h4>
          <ul className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2 p-4 text-text sm:grid-cols-3">
            {["Estudo da Bíblia", "Missões", "Oração", "Mordomia", "Serviço Real"].map(
              (ideal) => (
                <li key={ideal} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                  {ideal}
                </li>
              )
            )}
          </ul>
        </div>

        <h4 className="mt-12 mb-8 pt-2 font-semibold text-primary">Nossa História:</h4>
        <Timeline items={HISTORIA} />
      </div>
    </section>
  );
}
