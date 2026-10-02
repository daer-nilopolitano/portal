"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { revalidarTudo, useApi } from "@/lib/use-api";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { ModalSenha } from "@/components/painel/modal-senha";
import { ROTULO_CARGO_DIRETORIA } from "@/lib/labels";
import type { Diretoria, Membro } from "@/lib/types";

type MembroConselheiro = Pick<Membro, "id" | "nome">;

interface FormularioMandato {
  membro_id: string;
  cargo: string;
  data_inicio: string;
}

/**
 * Data de hoje (AAAA-MM-DD) no fuso de Brasília. `toISOString()` usa UTC e, à noite, já devolve o dia seguinte — e o
 * backend recusa `data_fim` no futuro.
 */
function hojeISO(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

const formularioVazio = (): FormularioMandato => ({
  membro_id: "",
  cargo: "",
  data_inicio: hojeISO(),
});

export default function PainelDiretoriaPage() {
  const { token, membro: membroLogado } = useAuth();
  const ehDiretoria = !!membroLogado?.cargo_diretoria;

  const { data: listaCarregada, isLoading: carregando, error: erroCarga } =
    useApi<Diretoria[]>("/diretoria/");
  const { data: conselheirosCarregados } = useApi<MembroConselheiro[]>(
    ehDiretoria ? "/membros/?tipo=conselheiro" : null
  );
  const lista = listaCarregada ?? [];
  const conselheiros = conselheirosCarregados ?? [];
  const erro = erroCarga ? "Não foi possível carregar a Diretoria." : null;

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<FormularioMandato>(formularioVazio);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [confirmandoSenha, setConfirmandoSenha] = useState(false);

  function abrirNovo() {
    setEditandoId(null);
    setFormulario(formularioVazio());
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(d: Diretoria) {
    setEditandoId(d.id);
    setFormulario({
      membro_id: String(d.membro_id),
      cargo: d.cargo,
      data_inicio: d.data_inicio,
    });
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  async function atualizarMandato() {
    await apiFetch(`/diretoria/${editandoId}/`, {
      token,
      method: "PUT",
      body: JSON.stringify({ cargo: formulario.cargo, data_inicio: formulario.data_inicio }),
    });
    setFormularioAberto(false);
    await revalidarTudo();
  }

  /** Dar cargo na Diretoria é o maior poder do sistema: o backend exige a senha de quem está concedendo. */
  async function criarMandato(senhaConfirmacao: string) {
    await apiFetch("/diretoria/", {
      token,
      method: "POST",
      body: JSON.stringify({
        membro_id: Number(formulario.membro_id),
        cargo: formulario.cargo,
        data_inicio: formulario.data_inicio,
        senha_confirmacao: senhaConfirmacao,
      }),
    });
    setConfirmandoSenha(false);
    setFormularioAberto(false);
    await revalidarTudo();
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!token) return;
    if (!editandoId) {
      setConfirmandoSenha(true);
      return;
    }
    setEnviando(true);
    setErroFormulario(null);
    try {
      await atualizarMandato();
    } catch (e) {
      setErroFormulario(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function encerrarMandato(d: Diretoria) {
    if (!token) return;
    if (!window.confirm(`Encerrar o mandato de ${d.membro_nome}?`)) return;
    try {
      await apiFetch(`/diretoria/${d.id}/`, {
        token,
        method: "PUT",
        body: JSON.stringify({ data_fim: hojeISO() }),
      });
      await revalidarTudo();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Não foi possível encerrar o mandato.");
    }
  }

  async function excluir(d: Diretoria) {
    if (!token) return;
    if (!window.confirm("Excluir este registro de mandato? Essa ação não pode ser desfeita.")) return;
    try {
      await apiFetch(`/diretoria/${d.id}/`, { token, method: "DELETE" });
      await revalidarTudo();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  const colunas: Coluna<Diretoria>[] = [
    { cabecalho: "Nome", render: (d) => <span className="font-medium text-text">{d.membro_nome}</span> },
    {
      cabecalho: "Cargo",
      render: (d) => <span className="text-text-muted">{ROTULO_CARGO_DIRETORIA[d.cargo]}</span>,
    },
    { cabecalho: "Desde", render: (d) => <span className="text-text-muted">{d.data_inicio}</span> },
    ...(ehDiretoria
      ? [
          {
            cabecalho: "Mandato",
            render: (d: Diretoria) => (
              <button
                onClick={() => encerrarMandato(d)}
                className="text-xs text-danger underline underline-offset-2"
              >
                Encerrar mandato
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Diretoria</h1>
        {ehDiretoria && (
          <button onClick={abrirNovo} className="btn-primary">
            + Novo mandato
          </button>
        )}
      </div>

      {formularioAberto && ehDiretoria && (
        <form
          onSubmit={salvar}
          className="mt-6 grid gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm text-text">Conselheiro</label>
            <select
              required
              disabled={!!editandoId}
              value={formulario.membro_id}
              onChange={(e) => setFormulario({ ...formulario, membro_id: e.target.value })}
              className="field"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {conselheiros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text">Cargo</label>
            <select
              required
              value={formulario.cargo}
              onChange={(e) => setFormulario({ ...formulario, cargo: e.target.value })}
              className="field"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {Object.entries(ROTULO_CARGO_DIRETORIA).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-text">Início do mandato</label>
            <input
              required
              type="date"
              value={formulario.data_inicio}
              onChange={(e) => setFormulario({ ...formulario, data_inicio: e.target.value })}
              className="field"
            />
          </div>

          {erroFormulario && <p className="sm:col-span-2 text-sm text-danger">{erroFormulario}</p>}

          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={enviando} className="btn-primary">
              {enviando ? "Salvando…" : editandoId ? "Salvar" : "Continuar"}
            </button>
            <button type="button" onClick={() => setFormularioAberto(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <DataTable
        itens={lista}
        colunas={colunas}
        chave={(d) => d.id}
        carregando={carregando}
        erro={erro}
        mensagemVazio="Nenhum mandato ativo no momento."
        onEditar={ehDiretoria ? abrirEdicao : undefined}
        onExcluir={ehDiretoria ? excluir : undefined}
        rotuloEditar={(d) => `Editar mandato de ${d.membro_nome}`}
        rotuloExcluir={(d) => `Excluir mandato de ${d.membro_nome}`}
      />

      <ModalSenha
        aberto={confirmandoSenha}
        titulo="Confirme com a sua senha"
        descricao="Dar um cargo na Diretoria concede poder sobre o sistema inteiro, então precisamos confirmar que é você."
        rotuloConfirmar="Conceder cargo"
        onConfirmar={criarMandato}
        onFechar={() => setConfirmandoSenha(false)}
      />
    </div>
  );
}
