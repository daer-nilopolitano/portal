"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { EMAIL_CONTATO, NOME_SITE } from "@/lib/content/site";

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
      await login(email, senha);
      router.push("/painel");
    } catch {
      setErro("Usuário ou senha inválidos.");
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
              Usuário
            </label>
            <input
              id="email"
              type="text"
              autoComplete="username"
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

        <p className="mt-4 text-center text-xs text-text-muted">
          Esqueceu a senha? Entre em contato pelo email: {EMAIL_CONTATO}
        </p>
      </div>
    </div>
  );
}
