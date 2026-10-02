"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { CampoSenha } from "@/components/ui/campo-senha";
import { Modal } from "@/components/ui/modal";

interface Props {
  aberto: boolean;
  titulo: string;
  descricao: string;
  rotuloConfirmar?: string;
  /** Recebe a senha digitada. Se lançar erro, a mensagem aparece na janela e ela continua aberta. */
  onConfirmar: (senha: string) => Promise<void>;
  onFechar: () => void;
}

/** Pede a senha de quem está logado antes de uma ação sensível (o backend confere com `senha_confirmacao`). */
export function ModalSenha({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar",
  onConfirmar,
  onFechar,
}: Props) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setSenha("");
      setErro(null);
    }
  }, [aberto]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await onConfirmar(senha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setEnviando(false);
      setSenha("");
    }
  }

  return (
    <Modal aberto={aberto} titulo={titulo} onFechar={onFechar} bloqueado={enviando}>
      <form onSubmit={enviar} className="space-y-4">
        <p className="text-sm text-text-muted">{descricao}</p>

        <CampoSenha
          id="senha-confirmacao"
          rotulo="Sua senha"
          valor={senha}
          aoMudar={setSenha}
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
            {enviando ? "Confirmando…" : rotuloConfirmar}
          </button>
          <button type="button" onClick={onFechar} disabled={enviando} className="btn-ghost">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
