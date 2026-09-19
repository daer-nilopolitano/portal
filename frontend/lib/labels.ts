export const ROTULO_TIPO: Record<string, string> = {
  conselheiro: "Conselheiro",
  auxiliar: "Auxiliar",
  embaixador_do_rei: "Embaixador do Rei",
};

export const ROTULO_CARGO_DIRETORIA: Record<string, string> = {
  coordenador: "Coordenador",
  presidente: "Presidente",
  vice_presidente: "Vice-Presidente",
  primeiro_secretario: "1º Secretário",
  segundo_secretario: "2º Secretário",
  diretor_midia_comunicacao: "Diretor de Mídia e Comunicação",
  diretor_esportes: "Diretor de Esportes",
};

export const ROTULO_POSTO: Record<string, string> = {
  escudeiro: "Embaixador Escudeiro",
  arauto: "Embaixador Arauto",
  senior: "Embaixador Sênior",
  emerito: "Embaixador Emérito",
};

export const ROTULO_CARGO_DIRETORIA_EMBAIXADA: Record<string, string> = {
  embaixador_chefe: "Embaixador Chefe",
  embaixador_assistente: "Embaixador Assistente",
  secretario: "Secretário",
  intendente: "Intendente",
  porta_voz: "Porta-voz",
  consul: "Cônsul",
  tesoureiro: "Tesoureiro",
  diretor_musica: "Diretor de Música",
  diretor_esportes: "Diretor de Esportes",
};

export const ROTULO_FAIXA_ETARIA: Record<string, string> = {
  junior: "Júnior (9-11 anos)",
  adolescente: "Adolescente (12-14 anos)",
  juvenil: "Juvenil (15-17 anos)",
};

// Precisa bater com DiaSemana em backend/core/models.py.
export const DIAS_SEMANA: { value: string; label: string }[] = [
  { value: "domingo", label: "Domingo" },
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
];
