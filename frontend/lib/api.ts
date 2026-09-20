/**
 * Helper para chamar a API do backend Django (Ninja + Wagtail headless).
 * Ex.: apiFetch("/igrejas/") ou apiFetch("/membros/", { token })
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const MEDIA_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/** Monta a URL absoluta de arquivos de mídia (fotos) vindos do backend Django. */
export function mediaUrl(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (caminho.startsWith("http")) return caminho;
  return `${MEDIA_ORIGIN}${caminho}`;
}

interface ApiFetchOptions extends RequestInit {
  token?: string | null;
  /**
   * Segundos de cache no servidor do Next.js (só para dados públicos).
   * Sem isso, a chamada nunca usa cache (`no-store`) — o padrão para tudo
   * que é autenticado ou precisa estar sempre atual.
   */
  revalidate?: number;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers, revalidate, ...resto } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...resto,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(revalidate !== undefined
      ? { next: { revalidate } }
      : { cache: "no-store" as const }),
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

/**
 * Atalho para dados públicos (sem token) — Igreja, páginas do CMS, etc.
 * Passe `{ revalidate: 60 }` para guardar a resposta em cache por 60 s.
 */
export async function getFromApi<T>(
  path: string,
  options: { revalidate?: number } = {}
): Promise<T> {
  return apiFetch<T>(path, options);
}
