/**
 * Helper mínimo para chamar a API do backend Django (Ninja + Wagtail headless).
 * Ex.: getFromApi("/igrejas/") ou getFromApi("/cms/pages/?type=cms.NoticiaPage")
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export async function getFromApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    // Ajustar estratégia de cache/revalidação conforme o tipo de conteúdo
    // (notícias/eventos podem usar revalidate; dados de gestão, não).
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Erro ao chamar ${path}: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
