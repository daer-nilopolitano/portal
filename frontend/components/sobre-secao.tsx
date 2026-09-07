import { SectionTitle } from "@/components/section-title";
import { Timeline, type TimelineItem } from "@/components/timeline";

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

export function SobreSecao() {
  return (
    <section id="sobre" className="border-t border-gray-100 bg-white px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <SectionTitle>Quem Somos</SectionTitle>

        <div className="mt-12 space-y-4">
          <h3 className="text-xl font-semibold text-daer-blue">O DAER Nilopolitano</h3>
          <p className="text-gray-700">
            O Departamento Associacional de Embaixadores do Rei (DAER) Nilopolitano é o
            órgão responsável por apoiar, orientar e fortalecer as embaixadas vinculadas
            às igrejas da Associação Batista Nilopolitana.
          </p>
          <p className="text-gray-700">
            Nossa missão é caminhar ao lado das igrejas locais, oferecendo o suporte
            necessário para que a organização Embaixadores do Rei cumpra seu papel
            transformador na vida dos meninos e jovens de Nilópolis.
          </p>

          <h4 className="pt-2 font-semibold text-daer-blue">O que fazemos:</h4>
          <ul className="space-y-2 text-gray-700">
            <li>
              <strong className="text-daer-blue">Eventos Associacionais:</strong>{" "}
              Promovemos torneios, conclaves, congressos, mutirões evangelísticos e
              encontros que integram as embaixadas de Nilópolis.
            </li>
            <li>
              <strong className="text-daer-blue">Treinamento e Suporte:</strong>{" "}
              Orientações, treinamentos e suporte prático para conselheiros e líderes
              locais.
            </li>
            <li>
              <strong className="text-daer-blue">Expansão:</strong> Auxiliamos igrejas
              locais na fundação e estruturação de novas embaixadas.
            </li>
          </ul>
        </div>

        <hr className="my-14 border-dashed border-gray-200" />

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-daer-blue">
            A Organização Embaixadores do Rei
          </h3>
          <p className="text-gray-700">
            Os Embaixadores do Rei (ER) é uma organização missionária das Igrejas
            Batistas voltada para meninos de 9 a 17 anos. O objetivo central é promover
            o desenvolvimento físico, moral e espiritual dos garotos, preparando-os para
            servirem a Deus e à sociedade.
          </p>

          <h4 className="pt-2 font-semibold text-daer-blue">Os 5 Ideais do Embaixador:</h4>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-700 sm:grid-cols-3">
            {["Estudo da Bíblia", "Missões", "Oração", "Mordomia", "Serviço Real"].map(
              (ideal) => (
                <li key={ideal} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-daer-yellow" />
                  {ideal}
                </li>
              )
            )}
          </ul>

          <div className="mt-6 border-l-4 border-daer-yellow bg-gray-50 p-5">
            <p className="text-gray-700">
              <strong className="text-daer-blue">Tema:</strong> &ldquo;Somos Embaixadores
              por Cristo&rdquo;
            </p>
            <p className="mt-2 text-gray-700">
              <strong className="text-daer-blue">Divisa:</strong> &ldquo;De sorte que
              somos embaixadores por Cristo, como se Deus por nós vos exortasse.
              Rogamo-vos, pois, por Cristo que vos reconcilieis com Deus.&rdquo; (II
              Coríntios 5:20)
            </p>
          </div>

          <h4 className="pt-4 font-semibold text-daer-blue">Identidade e Requisitos:</h4>
          <dl className="space-y-3 text-gray-700">
            <div>
              <dt className="font-medium text-daer-blue">Hino Oficial</dt>
              <dd>Firmando Propósitos</dd>
            </div>
            <div>
              <dt className="font-medium text-daer-blue">Cores</dt>
              <dd>Azul, Branco e Amarelo</dd>
            </div>
            <div>
              <dt className="font-medium text-daer-blue">Significado</dt>
              <dd>
                Um embaixador representa seu governo em outro país; o Embaixador do Rei
                representa Jesus Cristo aqui na terra.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-daer-blue">Requisitos Mínimos</dt>
              <dd>
                Para ser membro de uma embaixada, o menino deve saber o significado do
                nome, tema, divisa, compromisso e o hino oficial.
              </dd>
            </div>
          </dl>
        </div>

        <h4 className="mt-14 mb-8 text-center font-semibold text-daer-blue">
          Nossa História
        </h4>
        <Timeline items={HISTORIA} />
      </div>
    </section>
  );
}
