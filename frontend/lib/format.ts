/**
 * Formata uma data no formato "YYYY-MM-DD" (como vem do Django DateField)
 * para o formato brasileiro. Não usa `new Date(string)` direto porque o
 * JS interpreta strings "YYYY-MM-DD" como UTC — em fusos negativos (como o
 * do Brasil) isso pode exibir o dia anterior.
 */
export function formatarDataBR(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString("pt-BR");
}
