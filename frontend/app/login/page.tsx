"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { ErroApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { NOME_SITE } from "@/lib/content/site";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const membro = await login(email, senha);
      // Senha temporária (criada por um conselheiro): a primeira coisa a fazer é trocá-la.
      router.push(membro.deve_trocar_senha ? "/trocar-senha" : "/painel");
    } catch (e) {
      if (e instanceof ErroApi && e.status !== 401) {
        // 429 (muitas tentativas) e 403 (membro inativo) trazem uma mensagem útil do servidor.
        setErro(e.message);
      } else if (e instanceof ErroApi) {
        setErro("Usuário ou senha inválidos.");
      } else {
        setErro("Não foi possível conectar. Verifique sua internet e tente de novo.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Image src="/logo-daer.png" alt="" width={56} height={61} priority />
          <p className="mt-3 text-xl font-bold text-primary">{NOME_SITE}</p>
          <p className="mt-1 text-sm text-text-muted">
            Bem-vindo de volta! Entre com seus dados pra acessar sua área.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-lg border border-border bg-surface p-6"
        >
          <div>
            <label htmlFor="email" className="field-label">
              E-mail ou usuário
            </label>
            <input
              id="email"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              disabled={enviando}
              required
            />
          </div>

          <div>
            <label htmlFor="senha" className="field-label">
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={mostrarSenha ? "text" : "password"}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="field pr-11"
                disabled={enviando}
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((atual) => !atual)}
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={mostrarSenha}
                className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center text-text-muted hover:text-primary"
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {erro && (
            <p role="alert" className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{erro}</span>
            </p>
          )}

          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="mt-4 space-y-1 text-center text-xs text-text-muted">
          <p>
            <Link href="/esqueci-senha" className="text-primary underline underline-offset-2">
              Esqueci minha senha
            </Link>
          </p>
          <p>Não tem e-mail cadastrado? Peça ao seu conselheiro uma nova senha.</p>
        </div>
      </div>
    </div>
  );
}
