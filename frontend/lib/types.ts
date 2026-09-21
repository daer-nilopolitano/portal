/**
 * Tipos que espelham as entidades da API do backend (Django Ninja).
 *
 * Centralizados aqui porque antes viviam duplicados em vários componentes
 * (ex.: `Igreja` tinha 3 versões divergentes, `Embaixada` tinha 2) — o que
 * gera risco de um componente ficar desatualizado quando o schema do
 * backend muda. Cada componente importa só os campos que usa, com `Pick`
 * quando só precisa de um subconjunto (ex.: um <select> só precisa de
 * `id` e `nome`).
 *
 * Se o projeto crescer bastante, vale considerar gerar este arquivo
 * automaticamente a partir do OpenAPI que o Django Ninja já expõe em
 * /api/openapi.json (ex.: com `openapi-typescript`), eliminando de vez o
 * risco de desatualização manual.
 */

export interface Igreja {
  id: number;
  nome: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  latitude: number | null;
  longitude: number | null;
}

export interface HorarioReuniao {
  id: number;
  dia_semana: string;
  dia_semana_display: string;
  horario: string;
}

export interface Embaixada {
  id: number;
  nome: string;
  igreja_id: number;
  igreja_nome: string;
  conselheiro_nomes: string[];
  horarios_reuniao: HorarioReuniao[];
}

export type TipoMembro = "conselheiro" | "auxiliar" | "embaixador_do_rei";
export type PostoEmbaixador = "escudeiro" | "arauto" | "senior" | "emerito";
export type CargoDiretoriaEmbaixada =
  | "embaixador_chefe"
  | "embaixador_assistente"
  | "secretario"
  | "intendente"
  | "porta_voz"
  | "consul"
  | "tesoureiro"
  | "diretor_musica"
  | "diretor_esportes";

export interface Membro {
  id: number;
  nome: string;
  data_nascimento: string;
  telefone_contato: string;
  email: string | null;
  tipo: TipoMembro;
  posto_embaixador: PostoEmbaixador | null;
  cargo_embaixada: CargoDiretoriaEmbaixada | null;
  nome_responsavel: string;
  telefone_responsavel: string;
  embaixada_id: number;
  embaixada_nome: string;
  ativo: boolean;
  idade: number;
  faixa_etaria: string | null;
  tem_acesso: boolean;
}

export type CargoDiretoria =
  | "coordenador"
  | "presidente"
  | "vice_presidente"
  | "primeiro_secretario"
  | "segundo_secretario"
  | "diretor_midia_comunicacao"
  | "diretor_esportes";

export interface Diretoria {
  id: number;
  membro_id: number;
  membro_nome: string;
  cargo: CargoDiretoria;
  data_inicio: string;
  data_fim: string | null;
}

export type PapelNoGrupo = "lider" | "membro";

export interface ParticipanteGrupo {
  membro_id: number;
  membro_nome: string;
  papel_no_grupo: PapelNoGrupo;
}

export interface GrupoTrabalho {
  id: number;
  nome: string;
  participantes: ParticipanteGrupo[];
}

// Formato do endpoint público /embaixadas-publicas/ — só o que o site
// institucional pode mostrar (sem qualquer dado pessoal de Membro como
// telefone, e-mail ou data de nascimento).
export interface HorarioReuniaoPublico {
  dia_semana: string;
  horario: string;
}

export interface EmbaixadaPublica {
  id: number;
  nome: string;
  igreja_id: number;
  igreja_nome: string;
  conselheiros_nomes: string[];
  horarios_reuniao: HorarioReuniaoPublico[];
}

/**
 * Formato combinado usado pelo card de destaques da home (carrossel + mapa):
 * junta o endereço de `Igreja` com os dados públicos da `Embaixada`
 * associada. Montado no frontend a partir de dois endpoints distintos —
 * /igrejas/ e /embaixadas-publicas/ — porque no backend são recursos com
 * responsabilidades diferentes (geografia vs. gestão de embaixada). Só
 * igrejas que já têm uma embaixada correspondente viram um `EmbaixadaDestaque`.
 */
export interface EmbaixadaDestaque extends Igreja {
  embaixada_id: number;
  embaixada_nome: string;
  conselheiros_nomes: string[];
  horarios_reuniao: HorarioReuniaoPublico[];
}

export interface MembroResumo {
  id: number;
  nome: string;
}

export interface Estatisticas {
  tipo: TipoMembro;
  total_conselheiros: number;
  total_auxiliares: number;
  total_embaixadores: number;
  embaixadores_por_faixa: Record<string, number>;
  sem_carteirinha: MembroResumo[];
  sem_acesso: MembroResumo[];
  aniversariantes_mes: MembroResumo[];
  // Só populado pra Diretoria.
  embaixadas_sem_conselheiro: string[];
  // Só populado para quem está logado como embaixador_do_rei.
  conselheiros_embaixada: string[];
}

// Formato do campo de imagem devolvido pela Wagtail API (via ImageRenditionField).
// `url` é relativo ao backend (ex.: "/media/..."); use `full_url` (absoluto) como
// `src` de <Image>, já que o frontend roda em outra origem.
export interface ImagemRendition {
  url: string;
  full_url?: string;
  width: number;
  height: number;
  alt: string;
}

export interface NoticiaFoto {
  imagem: ImagemRendition | null;
  legenda: string;
}

// Campos usados na listagem de /noticias (sem corpo/galeria, mais leve).
export interface NoticiaResumo {
  id: number;
  slug: string;
  title: string;
  data_publicacao: string | null;
  autor: string;
  resumo: string;
  imagem_capa: ImagemRendition | null;
}

// Notícia completa, usada na página de detalhe (/noticias/[slug]).
export interface Noticia extends NoticiaResumo {
  corpo: string;
  galeria: NoticiaFoto[];
}
