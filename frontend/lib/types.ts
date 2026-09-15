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

export interface Embaixada {
  id: number;
  nome: string;
  igreja_id: number;
  igreja_nome: string;
  conselheiro_responsavel_id: number | null;
  conselheiro_responsavel_nome: string | null;
}

export interface Pessoa {
  id: number;
  nome: string;
  data_nascimento: string;
  telefone_contato: string;
  email: string | null;
  nome_responsavel: string;
  telefone_responsavel: string;
  embaixada_id: number;
  embaixada_nome: string;
  ativo: boolean;
  idade: number;
  faixa_etaria: string | null;
  tem_acesso: boolean;
}
