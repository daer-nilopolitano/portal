"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { CampoSenha } from "@/components/ui/campo-senha";
import { CartaoAuth } from "@/components/auth/cartao-auth";

const TAMANHO_MINIMO = 8; // igual ao MinimumLengthValidator padrão do Django

export default function TrocarSenhaPage() {
  const { token, membro, carregando, atualizarToken, logout, sairDeTodos } = useAuth();
  const router = useRouter();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroSessoes, setErroSessoes] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);

  useEffect(() => {
    if (!carregando && !membro) router.replace("/login");
  }, [carregando, membro, router]);

  if (carregando || !membro) return null;

  const obrigatoria = membro.deve_trocar_senha;

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setErro(null);
    if (novaSenha !== confirmacao) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setEnviando(true);
    try {
      // A troca invalida o token atual; o servidor devolve um novo para a pessoa continuar logada.
      const { access_token } = await apiFetch<{ access_token: string }>("/auth/trocar-senha/", {
        token,
        method: "POST",
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
      });
      await atualizarToken(access_token);
      router.replace("/painel");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível trocar a senha.");
      setEnviando(false);
    }
  }

  async function encerrarTodasAsSessoes() {
    if (!window.confirm("Sair de todos os dispositivos, inclusive deste? Você precisará entrar de novo.")) return;
    setErroSessoes(null);
    setEncerrando(true);
    try {
      await sairDeTodos();
    } catch (e) {
      setErroSessoes(e instanceof Error ? e.message : "Não foi possível encerrar as sessões.");
      setEncerrando(false);
    }
  }

  return (
    <CartaoAuth
      subtitulo={
        obrigatoria
          ? "Você entrou com uma senha temporária. Crie uma nova senha para continuar."
          : "Escolha uma nova senha para a sua conta."
      }
      rodape={
        obrigatoria ? (
          <button type="button" onClick={logout} className="text-primary underline underline-offset-2">
            Sair
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            className="text-primary underline underline-offset-2"
          >
            Voltar
          </button>
        )
      }
    >
      <form onSubmit={enviar} className="space-y-4">
        <CampoSenha
          id="senha-atual"
          rotulo={obrigatoria ? "Senha temporária" : "Senha atual"}
          valor={senhaAtual}
          aoMudar={setSenhaAtual}
          autoComplete="current-password"
          desabilitado={enviando}
        />
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
          {enviando ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>

      {!obrigatoria && (
        <div className="mt-6 border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-text">Segurança</h2>
          <p className="mt-1 text-xs text-text-muted">
            Perdeu o celular ou entrou em um computador de outra pessoa? Encerre todas as sessões abertas.
          </p>
          <button
            type="button"
            onClick={encerrarTodasAsSessoes}
            disabled={encerrando}
            className="btn-ghost mt-3 w-full"
          >
            {encerrando ? "Encerrando…" : "Sair de todos os dispositivos"}
          </button>
          {erroSessoes && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {erroSessoes}
            </p>
          )}
        </div>
      )}
    </CartaoAuth>
  );
}
