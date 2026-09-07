/**
 * Helper para chamar a API do backend Django (Ninja + Wagtail headless).
 * Ex.: apiFetch("/igrejas/") ou apiFetch("/pessoas/", { token })
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers, ...resto } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...resto,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    // Ajustar estratégia de cache/revalidação conforme o tipo de conteúdo
    // (notícias/eventos podem usar revalidate; dados de gestão, não).
    cache: "no-store",
  });

  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    throw new Error(corpo?.detail ?? `Erro ${res.status} ao chamar ${path}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** Atalho para dados públicos (sem token) — Igreja, páginas do CMS, etc. */
export async function getFromApi<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}
