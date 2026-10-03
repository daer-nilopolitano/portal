"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { revalidarTudo, useApi } from "@/lib/use-api";
import type { Embaixada } from "@/lib/types";

// Tipos locais, só com o que esta tela usa (mesmo estilo do Pick<Igreja, ...> da tela de embaixadas).
// Se preferir, mova Consulado e MembroOpcao para "@/lib/types".
type EmbaixadaOpcao = Pick<Embaixada, "id" | "nome">;

interface ConsuladoIntegrante {
  id: number;
  nome: string;
  eh_consul: boolean;
}

interface Consulado {
  id: number;
  nome: string;
  embaixada_id: number;
  embaixada_nome: string;
  consul_id: number | null;
  consul_nome: string | null;
  total_integrantes: number;
  integrantes: ConsuladoIntegrante[];
}

interface MembroOpcao {
  id: number;
  nome: string;
  embaixada_id: number;
  ativo: boolean;
  consulado_id: number | null;
  consulado_nome: string | null;
  eh_consul: boolean;
  cargo_embaixada: string | null;
}

interface FormularioConsulado {
  nome: string;
  embaixada_id: string;
  integrantes_ids: number[];
  consul_id: string; // "" = sem cônsul
}

const FORMULARIO_VAZIO: FormularioConsulado = {
  nome: "",
  embaixada_id: "",
  integrantes_ids: [],
  consul_id: "",
};

export default function PainelConsuladosPage() {
  const { token, membro } = useAuth();
  const ehDiretoria = !!membro?.cargo_diretoria;
  const ehConselheiro = membro?.tipo === "conselheiro";
  const ehAuxiliar = membro?.tipo === "auxiliar";
  const temAcesso = ehDiretoria || ehConselheiro || ehAuxiliar;
  // Auxiliar só consulta; Diretoria e conselheiro (da própria embaixada, o backend confere) editam.
  const podeEditar = ehDiretoria || ehConselheiro;

  const { data: consuladosCarregados, isLoading: carregando, error: erroCarga } =
    useApi<Consulado[]>(temAcesso ? "/consulados/" : null);
  const { data: membrosCarregados } = useApi<MembroOpcao[]>(
    temAcesso ? "/membros/?tipo=embaixador_do_rei" : null
  );
  const { data: embaixadasCarregadas } = useApi<EmbaixadaOpcao[]>(ehDiretoria ? "/embaixadas/" : null);

  const consulados = consuladosCarregados ?? [];
  const membros = membrosCarregados ?? [];
  const embaixadas = embaixadasCarregadas ?? [];
  const erro = erroCarga ? "Não foi possível carregar os consulados." : null;

  const [filtroEmbaixada, setFiltroEmbaixada] = useState("");
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<FormularioConsulado>(FORMULARIO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const visiveis = filtroEmbaixada
    ? consulados.filter((c) => String(c.embaixada_id) === filtroEmbaixada)
    : consulados;

  // Embaixada do formulário: a Diretoria escolhe; o conselheiro usa a própria.
  const embaixadaDoFormulario = ehDiretoria
    ? Number(formulario.embaixada_id) || null
    : membro?.embaixada_id ?? null;
  const candidatos = embaixadaDoFormulario
    ? membros.filter((m) => m.embaixada_id === embaixadaDoFormulario)
    : [];

  // O cônsul sai dos integrantes marcados. Quem já ocupa outro cargo na diretoria da embaixada não pode ser cônsul
  // (o backend recusa); o cônsul atual deste consulado continua elegível.
  const opcoesConsul = candidatos.filter(
    (m) =>
      formulario.integrantes_ids.includes(m.id) &&
      (m.cargo_embaixada === null || (m.eh_consul && m.consulado_id === editandoId))
  );

  function abrirNovo() {
    setEditandoId(null);
    setFormulario({
      ...FORMULARIO_VAZIO,
      embaixada_id: ehDiretoria ? filtroEmbaixada : String(membro?.embaixada_id ?? ""),
    });
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(c: Consulado) {
    setEditandoId(c.id);
    setFormulario({
      nome: c.nome,
      embaixada_id: String(c.embaixada_id),
      integrantes_ids: c.integrantes.map((i) => i.id),
      consul_id: c.consul_id ? String(c.consul_id) : "",
    });
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function alternarIntegrante(id: number) {
    const marcado = formulario.integrantes_ids.includes(id);
    setFormulario({
      ...formulario,
      integrantes_ids: marcado
        ? formulario.integrantes_ids.filter((i) => i !== id)
        : [...formulario.integrantes_ids, id],
      // Tirar o cônsul da lista de integrantes também tira a liderança (o backend exige cônsul integrante).
      consul_id: marcado && formulario.consul_id === String(id) ? "" : formulario.consul_id,
    });
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setEnviando(true);
    setErroFormulario(null);

    const nome = formulario.nome.trim();
    const consulId = formulario.consul_id ? Number(formulario.consul_id) : null;

    try {
      let consuladoId = editandoId;
      if (consuladoId === null) {
        const criado = await apiFetch<Consulado>("/consulados/", {
          token,
          method: "POST",
          body: JSON.stringify({
            embaixada_id: Number(formulario.embaixada_id),
            nome,
            consul_id: consulId,
          }),
        });
        consuladoId = criado.id;
        // Se o passo seguinte falhar, um novo "Salvar" edita este consulado em vez de tentar criar outro.
        setEditandoId(criado.id);
      } else {
        // Primeiro nome e cônsul: trocar ou tirar o cônsul antes de mexer na lista evita o 400
        // "o cônsul precisa continuar integrante".
        await apiFetch(`/consulados/${consuladoId}/`, {
          token,
          method: "PUT",
          body: JSON.stringify({ nome, consul_id: consulId }),
        });
      }

      await apiFetch(`/consulados/${consuladoId}/integrantes/`, {
        token,
        method: "PUT",
        body: JSON.stringify({ membro_ids: formulario.integrantes_ids }),
      });

      setFormularioAberto(false);
      await revalidarTudo();
    } catch (e) {
      void revalidarTudo(); // se algum passo já foi aplicado, a lista reflete
      setErroFormulario(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(c: Consulado) {
    if (!token) return;
    if (
      !window.confirm(
        `Excluir o consulado "${c.nome}"? Os embaixadores não são excluídos, só ficam sem consulado.`
      )
    )
      return;
    try {
      await apiFetch(`/consulados/${c.id}/`, { token, method: "DELETE" });
      await revalidarTudo();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  if (!temAcesso) {
    return <p className="text-sm text-text-muted">Sem permissão para acessar esta página.</p>;
  }

  // Embaixadores ativos sem consulado — só nas embaixadas que têm ao menos um (consulados são opcionais).
  const idsEmbaixadasComConsulado = Array.from(new Set(visiveis.map((c) => c.embaixada_id)));
  const nomeDaEmbaixada = new Map(consulados.map((c) => [c.embaixada_id, c.embaixada_nome]));
  const semConsulado = idsEmbaixadasComConsulado
    .map((id) => ({
      id,
      nome: nomeDaEmbaixada.get(id) ?? "",
      membros: membros.filter((m) => m.embaixada_id === id && m.ativo && m.consulado_id === null),
    }))
    .filter((grupo) => grupo.membros.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Consulados</h1>
        {podeEditar && (
          <button onClick={abrirNovo} className="btn-primary">
            + Novo consulado
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Pequenos grupos de Embaixadores do Rei dentro da embaixada, cada um com seu cônsul. São opcionais: só aparecem
        aqui as embaixadas que decidiram usá-los.
      </p>

      {ehDiretoria && embaixadas.length > 0 && (
        <div className="mt-4 max-w-xs">
          <label className="block text-sm text-text">Embaixada</label>
          <select
            value={filtroEmbaixada}
            onChange={(e) => setFiltroEmbaixada(e.target.value)}
            className="field"
          >
            <option value="">Todas</option>
            {embaixadas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {formularioAberto && (
        <form
          onSubmit={salvar}
          className="mt-6 grid gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm text-text">Nome do consulado</label>
            <input
              required
              maxLength={100}
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              className="field"
            />
          </div>

          {ehDiretoria && (
            <div>
              <label className="block text-sm text-text">Embaixada</label>
              {editandoId !== null ? (
                <p className="field bg-surface-2 text-text-muted">
                  {nomeDaEmbaixada.get(Number(formulario.embaixada_id)) ?? "—"}
                </p>
              ) : (
                <select
                  required
                  value={formulario.embaixada_id}
                  onChange={(e) =>
                    setFormulario({
                      ...formulario,
                      embaixada_id: e.target.value,
                      integrantes_ids: [],
                      consul_id: "",
                    })
                  }
                  className="field"
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {embaixadas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-sm text-text">Integrantes</label>
            {candidatos.length === 0 ? (
              <p className="mt-2 text-xs text-text-muted">
                {embaixadaDoFormulario
                  ? "Nenhum Embaixador do Rei cadastrado nesta embaixada."
                  : "Escolha a embaixada para ver os embaixadores."}
              </p>
            ) : (
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {candidatos.map((m) => {
                  const consulDeOutro = m.eh_consul && m.consulado_id !== editandoId;
                  const emOutroConsulado = m.consulado_id !== null && m.consulado_id !== editandoId;
                  return (
                    <label key={m.id} className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={formulario.integrantes_ids.includes(m.id)}
                        disabled={consulDeOutro}
                        onChange={() => alternarIntegrante(m.id)}
                      />
                      <span>
                        {m.nome}
                        {!m.ativo && " (inativo)"}
                      </span>
                      {emOutroConsulado && (
                        <span className="text-xs text-text-muted">
                          hoje em {m.consulado_nome}
                          {consulDeOutro ? " (é o cônsul de lá)" : ""}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-text-muted">
              Quem já está em outro consulado será movido para este ao salvar.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-text">Cônsul</label>
            <select
              value={formulario.consul_id}
              onChange={(e) => setFormulario({ ...formulario, consul_id: e.target.value })}
              className="field"
            >
              <option value="">Sem cônsul</option>
              {opcoesConsul.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              O cônsul precisa estar entre os integrantes e não pode ter outro cargo na diretoria da embaixada.
            </p>
          </div>

          {erroFormulario && <p className="sm:col-span-2 text-sm text-danger">{erroFormulario}</p>}

          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={enviando} className="btn-primary">
              {enviando ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => setFormularioAberto(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {carregando && <p className="text-sm text-text-muted">Carregando…</p>}
        {erro && <p className="text-sm text-danger">{erro}</p>}
        {!carregando && !erro && visiveis.length === 0 && (
          <p className="text-sm text-text-muted">
            Nenhum consulado cadastrado ainda.
            {podeEditar && " Use “Novo consulado” para criar o primeiro."}
          </p>
        )}

        {visiveis.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-text">{c.nome}</h2>
                {ehDiretoria && <p className="text-sm text-text-muted">{c.embaixada_nome}</p>}
                <p className="mt-1 text-sm text-text-muted">
                  Cônsul: {c.consul_nome ?? "ainda não definido"}
                </p>
              </div>
              {podeEditar && (
                <div className="flex gap-2">
                  <button
                    onClick={() => abrirEdicao(c)}
                    aria-label={`Editar ${c.nome}`}
                    className="btn-ghost text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => excluir(c)}
                    aria-label={`Excluir ${c.nome}`}
                    className="btn-ghost text-sm text-danger"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>

            <p className="mt-3 text-sm text-text">
              {c.total_integrantes === 1 ? "1 integrante" : `${c.total_integrantes} integrantes`}
            </p>
            {c.integrantes.length > 0 ? (
              <p className="mt-1 text-sm text-text-muted">
                {c.integrantes.map((i) => (i.eh_consul ? `${i.nome} (cônsul)` : i.nome)).join(", ")}
              </p>
            ) : (
              <p className="mt-1 text-xs text-text-muted">Nenhum integrante ainda.</p>
            )}
          </div>
        ))}
      </div>

      {semConsulado.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-primary">Sem consulado</h2>
          <p className="mt-1 text-sm text-text-muted">
            Embaixadores ativos que ainda não estão em nenhum consulado.
          </p>
          <div className="mt-3 space-y-2">
            {semConsulado.map((grupo) => (
              <p key={grupo.id} className="text-sm text-text-muted">
                {ehDiretoria && <span className="font-medium text-text">{grupo.nome}: </span>}
                {grupo.membros.map((m) => m.nome).join(", ")}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
