"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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
        <p className="text-center text-xl font-bold text-primary">DAER Nilopolitano</p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-6"
        >
          <div>
            <label htmlFor="email" className="block text-sm text-text">
              Usuário
            </label>
            <input
              id="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              required
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm text-text">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="field"
              required
            />
          </div>

          {erro && <p className="text-sm text-danger">{erro}</p>}

          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
