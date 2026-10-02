"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { CartaoAuth } from "@/components/auth/cartao-auth";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      // O servidor responde igual exista o e-mail ou não (não revela quem tem cadastro).
      const resposta = await apiFetch<{ mensagem: string }>("/auth/esqueci-senha/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMensagem(resposta.mensagem);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o pedido. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <CartaoAuth
      subtitulo="Informe seu e-mail ou usuário e enviaremos um link para criar uma nova senha, no e-mail cadastrado."
      rodape={
        <>
          <p>Não tem e-mail cadastrado? Peça ao seu conselheiro para definir uma nova senha para você.</p>
          <p className="mt-2">
            <Link href="/login" className="text-primary underline underline-offset-2">
              Voltar para o login
            </Link>
          </p>
        </>
      }
    >
      {mensagem ? (
        <div role="status" className="space-y-3 text-sm text-text">
          <p>{mensagem}</p>
          <p className="text-text-muted">
            Confira também a caixa de spam. O link vale por 24 horas e só pode ser usado uma vez.
          </p>
        </div>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label htmlFor="identificador" className="field-label">
              E-mail ou usuário
            </label>
            <input
              id="identificador"
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

          {erro && (
            <p role="alert" className="flex items-start gap-2 text-sm text-danger">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{erro}</span>
            </p>
          )}

          <button type="submit" disabled={enviando} className="btn-primary w-full">
            {enviando && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            {enviando ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}
    </CartaoAuth>
  );
}
