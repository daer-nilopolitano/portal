// Texto editorial da página institucional (seções Sobre, Embaixadores do
// Rei e Eventos). Separado dos componentes de layout pra poder editar o
// conteúdo (história, cronograma, texto da Sobre) sem mexer em JSX.

import type { TimelineItem } from "@/components/public/timeline";

export const SOBRE = {
  tituloPrincipal: "O DAER Nilopolitano",
  paragrafos: [
    "O Departamento Associacional de Embaixadores do Rei (DAER) Nilopolitano é o órgão responsável por apoiar, orientar e fortalecer as embaixadas vinculadas às igrejas da Associação Batista Nilopolitana.",
    "Nossa missão é caminhar ao lado das igrejas locais, oferecendo o suporte necessário para que a organização Embaixadores do Rei cumpra seu papel transformador na vida dos meninos e jovens de Nilópolis.",
  ],
  tituloAtividades: "O que fazemos:",
  atividades: [
    {
      titulo: "Eventos Associacionais:",
      texto:
        "Promovemos torneios, conclaves, congressos, mutirões evangelísticos e encontros que integram as embaixadas de Nilópolis.",
    },
    {
      titulo: "Treinamento e Suporte:",
      texto: "Orientações, treinamentos e suporte prático para conselheiros e líderes locais.",
    },
    {
      titulo: "Expansão:",
      texto: "Auxiliamos igrejas locais na fundação e estruturação de novas embaixadas.",
    },
  ],
};

export const EMBAIXADORES_DO_REI = {
  introducao:
    "Os Embaixadores do Rei (ER) é uma organização missionária das Igrejas Batistas voltada para meninos de 9 a 17 anos. O objetivo central é promover o desenvolvimento físico, moral e espiritual dos garotos, preparando-os para servirem a Deus e à sociedade.",
  tema: "Somos Embaixadores por Cristo",
  divisa:
    "De sorte que somos embaixadores por Cristo, como se Deus por nós vos exortasse. Rogamo-vos, pois, por Cristo que vos reconcilieis com Deus. (II Coríntios 5:20)",
  tituloIdentidade: "Identidade e Requisitos:",
  identidade: [
    {
      termo: "Significado",
      definicao:
        "Um embaixador representa seu governo em outro país; o Embaixador do Rei representa Jesus Cristo aqui na terra.",
    },
    { termo: "Cores", definicao: "Azul, Branco e Amarelo" },
    { termo: "Hino Oficial", definicao: "Firmando Propósitos" },
    {
      termo: "Requisitos Mínimos",
      definicao:
        "Para ser membro de uma embaixada, o menino deve saber o significado do nome, tema, divisa, compromisso e o hino oficial.",
    },
  ],
  tituloIdeais: "Os 5 Ideais do Embaixador:",
  cincoIdeais: ["Estudo da Bíblia", "Missões", "Oração", "Mordomia", "Serviço Real"],
  tituloHistoria: "Nossa História:",
};

export const HISTORIA_ER: TimelineItem[] = [
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

export const EVENTOS = {
  descricao: "Agenda de atividades do DAER Nilopolitano para o 2º semestre de 2026.",
};
