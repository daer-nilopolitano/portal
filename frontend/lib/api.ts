/**
 * Helper para chamar a API do backend Django (Ninja + Wagtail headless).
 * Ex.: apiFetch "/igrejas/" ou apiFetch "/membros/", { token }
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const MEDIA_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/** Monta a URL absoluta de arquivos de mídia (fotos) vindos do backend Django. */
export function mediaUrl(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (caminho.startsWith("http")) return caminho;
  return `${MEDIA_ORIGIN}${caminho}`;
}

/** Erro devolvido pela API. Além da mensagem (`detail`), guarda o status HTTP para quem precisar distinguir 401/429/etc. */
export class ErroApi extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
}

type AoNaoAutorizado = (tokenRecusado: string) => void;
let aoNaoAutorizado: AoNaoAutorizado | null = null;

/**
 * O AuthProvider registra aqui o que fazer quando o servidor recusa um token (401): sessão encerrada em outro
 * dispositivo, senha trocada, membro inativado... Recebe o token que foi recusado, para ignorar respostas atrasadas
 * de um token que já foi substituído.
 */
export function registrarAoNaoAutorizado(fn: AoNaoAutorizado | null) {
  aoNaoAutorizado = fn;
}

interface ApiFetchOptions extends RequestInit {
  token?: string | null;
  /**
   * Segundos de cache no servidor do Next.js (só para dados públicos). Sem isso, a chamada nunca usa cache (`no-store`).
   * O padrão para tudo que é autenticado ou precisa estar sempre atual.
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
    if (res.status === 401 && token) aoNaoAutorizado?.(token);
    const corpo = await res.json().catch(() => null);
    // Erros de validação (422) trazem `detail` como lista, não como texto.
    const detalhe = typeof corpo?.detail === "string" ? corpo.detail : null;
    throw new ErroApi(detalhe ?? `Erro ${res.status} ao chamar ${path}`, res.status);
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
