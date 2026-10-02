"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { CampoSenha } from "@/components/ui/campo-senha";
import { CartaoAuth } from "@/components/auth/cartao-auth";

const TAMANHO_MINIMO = 8;

// useSearchParams exige <Suspense> no Next 14, senão o build de produção falha.
export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <FormularioRedefinir />
    </Suspense>
  );
}

function FormularioRedefinir() {
  const params = useSearchParams();
  const uid = params.get("uid");
  const token = params.get("token");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState<string | null>(null);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (novaSenha !== confirmacao) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setEnviando(true);
    try {
      const resposta = await apiFetch<{ mensagem: string }>("/auth/redefinir-senha/", {
        method: "POST",
        body: JSON.stringify({ uid, token, nova_senha: novaSenha }),
      });
      setConcluido(resposta.mensagem);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível definir a senha.");
    } finally {
      setEnviando(false);
    }
  }

  if (!uid || !token) {
    return (
      <CartaoAuth subtitulo="Link inválido.">
        <p className="text-sm text-text">
          Este link está incompleto. Abra o link do e-mail por inteiro ou peça um novo.
        </p>
        <Link href="/esqueci-senha" className="btn-primary mt-4 w-full">
          Pedir novo link
        </Link>
      </CartaoAuth>
    );
  }

  if (concluido) {
    return (
      <CartaoAuth subtitulo="Tudo certo!">
        <p role="status" className="text-sm text-text">
          {concluido}
        </p>
        <Link href="/login" className="btn-primary mt-4 w-full">
          Ir para o login
        </Link>
      </CartaoAuth>
    );
  }

  return (
    <CartaoAuth
      subtitulo="Crie a senha que você usará para entrar."
      rodape={
        <Link href="/esqueci-senha" className="text-primary underline underline-offset-2">
          O link expirou? Peça um novo
        </Link>
      }
    >
      <form onSubmit={enviar} className="space-y-4">
        <CampoSenha
          id="nova-senha"
          rotulo="Nova senha"
          valor={novaSenha}
          aoMudar={setNovaSenha}
          autoComplete="new-password"
          desabilitado={enviando}
          minLength={TAMANHO_MINIMO}
          ajuda={`Pelo menos ${TAMANHO_MINIMO} caracteres. Evite senhas comuns e só números.`}
        />
        <CampoSenha
          id="confirmacao"
          rotulo="Repita a nova senha"
          valor={confirmacao}
          aoMudar={setConfirmacao}
          autoComplete="new-password"
          desabilitado={enviando}
        />

        {erro && (
          <p role="alert" className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{erro}</span>
          </p>
        )}

        <button type="submit" disabled={enviando} className="btn-primary w-full">
          {enviando && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {enviando ? "Salvando…" : "Salvar senha"}
        </button>
      </form>
    </CartaoAuth>
  );
}
