"use client";

/**
 * Contexto de autenticação, compartilhado por toda a aplicação (site público
 * e área logada). Guarda o token JWT e os dados do Membro logado (via
 * /api/auth/me/), e expõe login/logout.
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
  useState,
  type ReactNode,
} from "react";

export type Tipo = "conselheiro" | "auxiliar" | "embaixador_do_rei";

export interface MembroLogado {
  membro_id: number;
  nome: string;
  embaixada_id: number;
  embaixada_nome: string;
  tipo: Tipo;
  posto_embaixador: string | null;
  cargo_diretoria: string | null;
}

interface AuthContextValue {
  token: string | null;
  membro: MembroLogado | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const CHAVE_TOKEN = "daer_token";

async function buscarMembroLogado(token: string): Promise<MembroLogado> {
  const res = await fetch(`${API_URL}/auth/me/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Sessão expirada ou inválida.");
  }
  return res.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [membro, setMembro] = useState<MembroLogado | null>(null);
  const [carregando, setCarregando] = useState(true);

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

  const login = useCallback(async (email: string, senha: string) => {
    const res = await fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    if (!res.ok) {
      throw new Error("E-mail ou senha inválidos.");
    }
    const dados = await res.json();
    localStorage.setItem(CHAVE_TOKEN, dados.access_token);
    setToken(dados.access_token);
    setMembro(await buscarMembroLogado(dados.access_token));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CHAVE_TOKEN);
    setToken(null);
    setMembro(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, membro, carregando, login, logout }}>
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
