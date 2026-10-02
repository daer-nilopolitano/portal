"use client";

/**
 * Contexto de autenticação, compartilhado por toda a aplicação (site público
 * e área logada). Guarda o token JWT e os dados do Membro logado (via
 * /api/auth/me/), e expõe login/logout.
 *
 * - Se o servidor recusar o token (401: sessão encerrada em outro dispositivo,
 *   senha trocada, membro inativado), a sessão local é encerrada sozinha.
 * - Membro com senha temporária (`deve_trocar_senha`) é levado a /trocar-senha
 *   ao tentar usar a área logada.
 *
 * TODO(segurança): o token fica em localStorage por simplicidade no MVP —
 * funciona bem, mas é acessível a qualquer script (risco de XSS). Uma
 * evolução futura é mover para um cookie httpOnly setado por uma rota do
 * Next.js, o que também permite proteger rotas no middleware (server-side)
 * em vez de só no client como está agora.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, registrarAoNaoAutorizado } from "@/lib/api";
import { limparCache } from "@/lib/cache";

export type Tipo = "conselheiro" | "auxiliar" | "embaixador_do_rei";

export interface MembroLogado {
  membro_id: number;
  nome: string;
  embaixada_id: number;
  embaixada_nome: string;
  tipo: Tipo;
  posto_embaixador: string | null;
  cargo_diretoria: string | null;
  /** Nome de login: o e-mail ou, para quem não tem e-mail (ou divide com outro membro), o usuário gerado. */
  usuario: string;
  /** `true` enquanto o membro usa uma senha temporária: só pode trocar a senha. */
  deve_trocar_senha: boolean;
}

interface AuthContextValue {
  token: string | null;
  membro: MembroLogado | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<MembroLogado>;
  logout: () => void;
  /** Troca o token guardado (ex.: o novo token devolvido ao trocar a senha) e recarrega os dados do membro. */
  atualizarToken: (novoToken: string) => Promise<void>;
  /** Invalida o token em todos os dispositivos (inclusive neste) e encerra a sessão local. */
  sairDeTodos: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CHAVE_TOKEN = "daer_token";

// Áreas que exigem senha definitiva. O resto do site público continua acessível.
const AREAS_BLOQUEADAS_COM_SENHA_TEMPORARIA = ["/painel", "/minha-carteirinha"];

function buscarMembroLogado(token: string): Promise<MembroLogado> {
  return apiFetch<MembroLogado>("/auth/me/", { token });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [membro, setMembro] = useState<MembroLogado | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Token atual, lido pelo tratador de 401 sem precisar recriá-lo a cada troca de token.
  const tokenAtual = useRef<string | null>(null);
  tokenAtual.current = token;

  useEffect(() => {
    const tokenSalvo = localStorage.getItem(CHAVE_TOKEN);
    if (!tokenSalvo) {
      setCarregando(false);
      return;
    }
    setToken(tokenSalvo);
    buscarMembroLogado(tokenSalvo)
      .then(setMembro)
      .catch(() => {
        localStorage.removeItem(CHAVE_TOKEN);
        setToken(null);
      })
      .finally(() => setCarregando(false));
  }, []);

  const logout = useCallback(() => {
    limparCache();
    localStorage.removeItem(CHAVE_TOKEN);
    setToken(null);
    setMembro(null);
  }, []);

  // Qualquer chamada autenticada que volte 401 encerra a sessão local. Só vale se o token recusado ainda é o atual
  // (uma resposta atrasada de um token já substituído não pode derrubar a sessão nova).
  useEffect(() => {
    registrarAoNaoAutorizado((tokenRecusado) => {
      if (tokenRecusado === tokenAtual.current) logout();
    });
    return () => registrarAoNaoAutorizado(null);
  }, [logout]);

  // Senha temporária: só a tela de troca de senha funciona (o backend devolve 403 no resto).
  useEffect(() => {
    if (carregando || !membro?.deve_trocar_senha) return;
    const emAreaBloqueada = AREAS_BLOQUEADAS_COM_SENHA_TEMPORARIA.some((p) => pathname.startsWith(p));
    if (emAreaBloqueada) router.replace("/trocar-senha");
  }, [carregando, membro?.deve_trocar_senha, pathname, router]);

  const login = useCallback(async (email: string, senha: string) => {
    const dados = await apiFetch<{ access_token: string }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    limparCache(); // nada de dados do usuário anterior sobrando em memória
    localStorage.setItem(CHAVE_TOKEN, dados.access_token);
    setToken(dados.access_token);
    try {
      const dadosMembro = await buscarMembroLogado(dados.access_token);
      setMembro(dadosMembro);
      return dadosMembro;
    } catch (erro) {
      localStorage.removeItem(CHAVE_TOKEN);
      setToken(null);
      throw erro;
    }
  }, []);

  const atualizarToken = useCallback(async (novoToken: string) => {
    const dadosMembro = await buscarMembroLogado(novoToken);
    localStorage.setItem(CHAVE_TOKEN, novoToken);
    setToken(novoToken);
    setMembro(dadosMembro);
  }, []);

  const sairDeTodos = useCallback(async () => {
    if (!token) return;
    await apiFetch("/auth/sair-todos/", { token, method: "POST" });
    logout();
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{ token, membro, carregando, login, logout, atualizarToken, sairDeTodos }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa ser usado dentro de <AuthProvider>.");
  }
  return contexto;
}
