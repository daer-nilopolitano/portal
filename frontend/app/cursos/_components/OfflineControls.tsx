"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  aoMudarCursosOffline,
  baixarCurso,
  estadoDoCurso,
  formatarBytes,
  removerCurso,
  suportaCursosOffline,
  totalOcupado,
  type MetaCurso,
  type PacoteOffline,
  type Progresso,
} from "@/lib/cursos-offline";

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof DOMException && erro.name === "QuotaExceededError") {
    return "Sem espaço no aparelho para baixar este curso.";
  }
  if (!navigator.onLine) return "Sem conexão. Tente de novo quando estiver online.";
  return "Não foi possível baixar o curso. Tente novamente.";
}

/** Botões para ler um curso sem internet: baixar sob demanda, mostrar o tamanho e remover. */
export default function OfflineControls({ pacote }: Readonly<{ pacote: PacoteOffline }>) {
  const [suportado, setSuportado] = useState(false);
  const [online, setOnline] = useState(true);
  const [meta, setMeta] = useState<MetaCurso | null>(null);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const controlador = useRef<AbortController | null>(null);

  const recarregar = useCallback(async () => {
    setMeta(await estadoDoCurso(pacote.slug));
  }, [pacote.slug]);

  useEffect(() => {
    if (!suportaCursosOffline()) return;
    setSuportado(true);
    setOnline(navigator.onLine);
    recarregar();

    const aoMudarConexao = () => setOnline(navigator.onLine);
    window.addEventListener("online", aoMudarConexao);
    window.addEventListener("offline", aoMudarConexao);
    const parar = aoMudarCursosOffline(recarregar);
    return () => {
      window.removeEventListener("online", aoMudarConexao);
      window.removeEventListener("offline", aoMudarConexao);
      parar();
      controlador.current?.abort(); // saiu da página no meio do download
    };
  }, [recarregar]);

  async function baixar() {
    setErro(null);
    const cancelavel = new AbortController();
    controlador.current = cancelavel;
    setProgresso({ feitos: 0, total: pacote.paginas.length + pacote.imagens.length });
    try {
      await baixarCurso(pacote, { sinal: cancelavel.signal, aoProgresso: setProgresso });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setErro(mensagemDeErro(e));
    } finally {
      controlador.current = null;
      setProgresso(null);
      await recarregar();
    }
  }

  async function remover() {
    setErro(null);
    setRemovendo(true);
    try {
      await removerCurso(pacote.slug);
    } finally {
      setRemovendo(false);
      await recarregar();
    }
  }

  if (!suportado) return null;

  const desatualizado = meta !== null && meta.versao !== pacote.versao;

  return (
    <div className="c-offline" role="group" aria-label={`Leitura offline: ${pacote.titulo}`}>
      {progresso ? (
        <>
          <p className="c-offline__status" role="status">
            Baixando… {progresso.feitos} de {progresso.total}
          </p>
          <progress className="c-offline__bar" value={progresso.feitos} max={Math.max(progresso.total, 1)} />
          <button type="button" className="c-offline__btn c-offline__btn--quiet" onClick={() => controlador.current?.abort()}>
            Cancelar
          </button>
        </>
      ) : meta ? (
        <>
          <p className="c-offline__status">
            <span aria-hidden="true">✓ </span>
            Disponível offline · {formatarBytes(meta.bytes)}
            {desatualizado && " · há uma versão mais nova"}
          </p>
          <div className="c-offline__actions">
            {desatualizado && (
              <button type="button" className="c-offline__btn" onClick={baixar} disabled={!online}>
                Atualizar
              </button>
            )}
            <button type="button" className="c-offline__btn c-offline__btn--quiet" onClick={remover} disabled={removendo}>
              {removendo ? "Removendo…" : "Remover do aparelho"}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="c-offline__btn" onClick={baixar} disabled={!online}>
          Baixar para ler offline <span className="c-offline__size">(~{formatarBytes(pacote.bytesEstimados)})</span>
        </button>
      )}
      {!online && !meta && <p className="c-offline__nota">Sem conexão. Conecte-se para baixar.</p>}
      {erro && (
        <p className="c-offline__erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Soma do espaço usado por todos os cursos baixados (aparece só se houver algum). */
export function ResumoOffline() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const atualizar = () => setTotal(totalOcupado());
    atualizar();
    return aoMudarCursosOffline(atualizar);
  }, []);

  if (total === 0) return null;
  return <p className="c-offline-total">Espaço usado pelos cursos offline: {formatarBytes(total)}</p>;
}
