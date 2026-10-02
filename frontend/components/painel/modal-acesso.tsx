"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Membro } from "@/lib/types";
import { CampoSenha } from "@/components/ui/campo-senha";
import { Modal } from "@/components/ui/modal";

/**
 * `usuario` e `convite_pendente` vêm do MembroOut do backend. Quando os dois campos forem adicionados a `Membro` em
 * lib/types.ts, esta interseção pode virar só `Membro`.
 */
export type MembroAcesso = Membro & {
  usuario?: string | null;
  convite_pendente?: boolean;
};

interface RespostaAcesso {
  detail: string;
  usuario?: string | null;
  senha_temporaria?: string | null;
}

interface Props {
  /** Membro cujo acesso está sendo criado/gerenciado; `null` mantém a janela fechada. */
  membro: MembroAcesso | null;
  token: string | null;
  onFechar: () => void;
  /** Chamado depois de cada ação que deu certo (para recarregar a lista). */
  onAtualizado: () => void | Promise<void>;
}

// Sem caracteres ambíguos (0/o, 1/l/i) nem maiúsculas: fácil de ditar e de digitar no celular.
const ALFABETO_SENHA = "abcdefghjkmnpqrstuvwxyz23456789";

function gerarSenhaTemporaria(tamanho = 10): string {
  const sorteio = new Uint32Array(tamanho);
  crypto.getRandomValues(sorteio);
  return Array.from(sorteio, (n) => ALFABETO_SENHA[n % ALFABETO_SENHA.length]).join("");
}

export function ModalAcesso({ membro, token, onFechar, onAtualizado }: Props) {
  // Enquanto a senha temporária estiver na tela e não tiver sido anotada, Esc não fecha a janela.
  const [bloqueado, setBloqueado] = useState(false);

  function fechar() {
    setBloqueado(false);
    onFechar();
  }

  const titulo = !membro
    ? ""
    : membro.tem_acesso
      ? `Acesso de ${membro.nome}`
      : `Criar acesso para ${membro.nome}`;

  return (
    <Modal aberto={!!membro} titulo={titulo} onFechar={fechar} bloqueado={bloqueado}>
      {membro && (
        <Conteudo
          key={membro.id}
          membro={membro}
          token={token}
          onFechar={fechar}
          onAtualizado={onAtualizado}
          onBloquear={setBloqueado}
        />
      )}
    </Modal>
  );
}

type Etapa = "escolha" | "formulario" | "resultado";
type Metodo = "link" | "temporaria";

interface ConteudoProps {
  membro: MembroAcesso;
  token: string | null;
  onFechar: () => void;
  onAtualizado: () => void | Promise<void>;
  onBloquear: (bloqueado: boolean) => void;
}

function Conteudo({ membro, token, onFechar, onAtualizado, onBloquear }: ConteudoProps) {
  const jaTemAcesso = membro.tem_acesso;
  const temEmail = !!membro.email;

  const [etapa, setEtapa] = useState<Etapa>(jaTemAcesso ? "escolha" : "formulario");
  const [metodo, setMetodo] = useState<Metodo>(temEmail ? "link" : "temporaria");
  const [senhaTemporaria, setSenhaTemporaria] = useState(() => gerarSenhaTemporaria());
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    detail: string;
    usuario: string | null;
    senha: string | null;
  } | null>(null);
  const [copiado, setCopiado] = useState<"usuario" | "senha" | null>(null);

  async function executar(acao: () => Promise<RespostaAcesso>, senhaMostrada?: string) {
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await acao();
      const senha = resposta.senha_temporaria ?? senhaMostrada ?? null;
      setResultado({
        detail: resposta.detail,
        usuario: resposta.usuario ?? membro.usuario ?? membro.email ?? null,
        senha,
      });
      onBloquear(!!senha);
      setEtapa("resultado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir.");
      return;
    } finally {
      setEnviando(false);
      setSenhaConfirmacao("");
    }
    // Recarregar a lista não pode transformar uma ação que deu certo em erro.
    try {
      await onAtualizado();
    } catch {
      /* a lista se atualiza na próxima visita */
    }
  }

  function enviarFormulario(evento: FormEvent) {
    evento.preventDefault();
    if (!token) return;
    const usaSenhaTemporaria = jaTemAcesso || metodo === "temporaria";

    if (jaTemAcesso) {
      return executar(
        () =>
          apiFetch<RespostaAcesso>(`/membros/${membro.id}/definir-senha-temporaria/`, {
            token,
            method: "POST",
            body: JSON.stringify({
              senha_confirmacao: senhaConfirmacao,
              senha_temporaria: senhaTemporaria,
            }),
          }),
        senhaTemporaria,
      );
    }
    return executar(
      () =>
        apiFetch<RespostaAcesso>(`/membros/${membro.id}/criar-acesso/`, {
          token,
          method: "POST",
          body: JSON.stringify({
            senha_confirmacao: senhaConfirmacao,
            senha_temporaria: usaSenhaTemporaria ? senhaTemporaria : null,
          }),
        }),
      usaSenhaTemporaria ? senhaTemporaria : undefined,
    );
  }

  function reenviarLink() {
    if (!token) return;
    return executar(() =>
      apiFetch<RespostaAcesso>(`/membros/${membro.id}/enviar-link-senha/`, { token, method: "POST" }),
    );
  }

  function encerrarSessoes() {
    if (!token) return;
    if (!window.confirm(`Encerrar todas as sessões abertas de ${membro.nome}? Ele(a) precisará entrar de novo.`)) {
      return;
    }
    return executar(() =>
      apiFetch<RespostaAcesso>(`/membros/${membro.id}/revogar-sessoes/`, { token, method: "POST" }),
    );
  }

  async function copiar(texto: string, qual: "usuario" | "senha") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* sem permissão para a área de transferência: o texto está selecionável na tela */
    }
  }

  // ---------- Resultado ----------
  if (etapa === "resultado" && resultado) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm text-text">
          {resultado.detail}
        </p>

        {/* Usuário gerado (sem e-mail, ou e-mail dividido com outro membro): quem for entrar precisa saber qual é. */}
        {!resultado.senha && resultado.usuario && !resultado.usuario.includes("@") && (
          <p className="text-sm text-text">
            Usuário para entrar: <strong className="select-all">{resultado.usuario}</strong>
          </p>
        )}

        {resultado.senha && (
          <div className="space-y-3 rounded-md border border-border bg-surface-2 p-4">
            <LinhaCopiavel
              rotulo="Usuário"
              valor={resultado.usuario ?? ""}
              copiado={copiado === "usuario"}
              onCopiar={() => copiar(resultado.usuario ?? "", "usuario")}
            />
            <LinhaCopiavel
              rotulo="Senha temporária"
              valor={resultado.senha}
              copiado={copiado === "senha"}
              onCopiar={() => copiar(resultado.senha ?? "", "senha")}
            />
            <p className="text-xs text-text-muted">
              Anote ou envie agora ao membro (ou ao responsável): esta senha <strong>não será mostrada de novo</strong>.
              No primeiro acesso, ele(a) precisará criar uma senha nova.
            </p>
          </div>
        )}

        <button type="button" onClick={onFechar} className="btn-primary">
          {resultado.senha ? "Já anotei" : "Fechar"}
        </button>
      </div>
    );
  }

  // ---------- Escolha (membro que já tem acesso) ----------
  if (etapa === "escolha") {
    return (
      <div className="space-y-4">
        <div className="text-sm">
          <p className="text-text-muted">Usuário de login</p>
          <p className="font-medium text-text">{membro.usuario ?? membro.email ?? "—"}</p>
          {membro.convite_pendente && (
            <p className="mt-2 text-xs text-text-muted">
              Convite pendente: este membro ainda não definiu a própria senha.
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2">
          {temEmail && (
            <button type="button" onClick={reenviarLink} disabled={enviando} className="btn-ghost">
              {membro.convite_pendente ? "Reenviar convite por e-mail" : "Enviar link para redefinir a senha"}
            </button>
          )}
          <button type="button" onClick={() => setEtapa("formulario")} disabled={enviando} className="btn-ghost">
            Definir nova senha temporária
          </button>
          <button type="button" onClick={encerrarSessoes} disabled={enviando} className="btn-ghost">
            Encerrar todas as sessões abertas
          </button>
        </div>

        {!temEmail && (
          <p className="text-xs text-text-muted">
            Sem e-mail cadastrado, a redefinição de senha só é possível por uma senha temporária.
          </p>
        )}

        {enviando && (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Aguarde…
          </p>
        )}
        {erro && (
          <p role="alert" className="text-sm text-danger">
            {erro}
          </p>
        )}

        <button type="button" onClick={onFechar} disabled={enviando} className="btn-ghost">
          Fechar
        </button>
      </div>
    );
  }

  // ---------- Formulário (criar acesso ou nova senha temporária) ----------
  const mostraSenhaTemporaria = jaTemAcesso || metodo === "temporaria";

  return (
    <form onSubmit={enviarFormulario} className="space-y-4">
      {!jaTemAcesso && temEmail && (
        <fieldset className="space-y-2">
          <legend className="text-sm text-text">Como o membro vai definir a senha?</legend>
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="radio"
              name="metodo"
              checked={metodo === "link"}
              onChange={() => setMetodo("link")}
              className="mt-1"
            />
            <span>
              Enviar um link por e-mail <span className="text-text-muted">(recomendado)</span>
              <span className="block text-xs text-text-muted">Para {membro.email}. O link vale 24 horas.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="radio"
              name="metodo"
              checked={metodo === "temporaria"}
              onChange={() => setMetodo("temporaria")}
              className="mt-1"
            />
            <span>
              Definir uma senha temporária
              <span className="block text-xs text-text-muted">Você passa a senha ao membro; ele troca no primeiro acesso.</span>
            </span>
          </label>
        </fieldset>
      )}

      {!jaTemAcesso && !temEmail && (
        <p className="text-sm text-text-muted">
          Este membro não tem e-mail. O usuário de login será criado a partir do nome (ex.: joao_silva) e ele(a)
          entrará com a senha temporária abaixo.
        </p>
      )}

      {jaTemAcesso && (
        <p className="text-sm text-text-muted">
          A senha atual deixa de valer e as sessões abertas são encerradas. No próximo acesso, o membro precisará
          criar uma senha nova.
        </p>
      )}

      {mostraSenhaTemporaria && (
        <div>
          <label htmlFor="senha-temporaria" className="field-label">
            Senha temporária
          </label>
          <div className="flex gap-2">
            <input
              id="senha-temporaria"
              value={senhaTemporaria}
              onChange={(e) => setSenhaTemporaria(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="field font-mono"
              disabled={enviando}
              required
            />
            <button
              type="button"
              onClick={() => setSenhaTemporaria(gerarSenhaTemporaria())}
              disabled={enviando}
              className="btn-ghost whitespace-nowrap"
            >
              Gerar outra
            </button>
          </div>
        </div>
      )}

      <CampoSenha
        id="senha-confirmacao"
        rotulo="Sua senha (para confirmar)"
        valor={senhaConfirmacao}
        aoMudar={setSenhaConfirmacao}
        autoComplete="current-password"
        desabilitado={enviando}
      />

      {erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={enviando} className="btn-primary">
          {enviando && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {enviando ? "Salvando…" : jaTemAcesso ? "Definir senha" : "Criar acesso"}
        </button>
        <button
          type="button"
          onClick={jaTemAcesso ? () => setEtapa("escolha") : onFechar}
          disabled={enviando}
          className="btn-ghost"
        >
          {jaTemAcesso ? "Voltar" : "Cancelar"}
        </button>
      </div>
    </form>
  );
}

function LinhaCopiavel({
  rotulo,
  valor,
  copiado,
  onCopiar,
}: {
  rotulo: string;
  valor: string;
  copiado: boolean;
  onCopiar: () => void;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted">{rotulo}</p>
      <div className="flex items-center justify-between gap-2">
        <code className="select-all break-all text-base font-semibold text-text">{valor}</code>
        <button
          type="button"
          onClick={onCopiar}
          aria-label={`Copiar ${rotulo.toLowerCase()}`}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-text-muted hover:text-primary"
        >
          {copiado ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
