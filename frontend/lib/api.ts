/**
 * Helper para chamar a API do backend Django (Ninja + Wagtail headless).
 * Ex.: apiFetch("/igrejas/") ou apiFetch("/pessoas/", { token })
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
