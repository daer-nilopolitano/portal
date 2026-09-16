"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { DIAS_SEMANA } from "@/lib/labels";
import type { Embaixada, Igreja, Pessoa } from "@/lib/types";

// Esta tela só usa id/nome de Igreja e de Pessoa (pra popular os <select>) —
// Pick evita puxar campos que aqui não são usados (endereço, faixa etária...)
type IgrejaOpcao = Pick<Igreja, "id" | "nome">;
type PessoaConselheiro = Pick<Pessoa, "id" | "nome">;

interface FormularioHorario {
  dia_semana: string;
  horario: string;
}

interface FormularioEmbaixada {
  nome: string;
  igreja_id: string;
  conselheiro_responsavel_id: string;
  conselheiro_ids: string[];
  horarios_reuniao: FormularioHorario[];
}

const FORMULARIO_VAZIO: FormularioEmbaixada = {
  nome: "",
  igreja_id: "",
  conselheiro_responsavel_id: "",
  conselheiro_ids: [],
  horarios_reuniao: [],
};

export default function PainelEmbaixadasPage() {
  const { token } = useAuth();

  const [lista, setLista] = useState<Embaixada[]>([]);
  const [igrejas, setIgrejas] = useState<IgrejaOpcao[]>([]);
  const [conselheiros, setConselheiros] = useState<PessoaConselheiro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<FormularioEmbaixada>(FORMULARIO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setErro(null);
    try {
      const [listaEmbaixadas, listaIgrejas, listaConselheiros] = await Promise.all([
        apiFetch<Embaixada[]>("/embaixadas/", { token }),
        apiFetch<IgrejaOpcao[]>("/igrejas/", { token }),
        apiFetch<PessoaConselheiro[]>("/pessoas/?papel=conselheiro", { token }),
      ]);
      setLista(listaEmbaixadas);
      setIgrejas(listaIgrejas);
      setConselheiros(listaConselheiros);
    } catch {
      setErro("Não foi possível carregar a lista.");
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNovo() {
    setEditandoId(null);
    setFormulario(FORMULARIO_VAZIO);
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(e: Embaixada) {
    setEditandoId(e.id);
    setFormulario({
      nome: e.nome,
      igreja_id: String(e.igreja_id),
      conselheiro_responsavel_id: e.conselheiro_responsavel_id
        ? String(e.conselheiro_responsavel_id)
        : "",
      conselheiro_ids: e.conselheiro_ids.map(String),
      horarios_reuniao: e.horarios_reuniao.map((h) => ({
        dia_semana: h.dia_semana,
        horario: h.horario,
      })),
    });
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function adicionarHorario() {
    setFormulario({
      ...formulario,
      horarios_reuniao: [...formulario.horarios_reuniao, { dia_semana: "sabado", horario: "16:00" }],
    });
  }

  function removerHorario(indice: number) {
    setFormulario({
      ...formulario,
      horarios_reuniao: formulario.horarios_reuniao.filter((_, i) => i !== indice),
    });
  }

  function atualizarHorario(indice: number, campo: keyof FormularioHorario, valor: string) {
    setFormulario({
      ...formulario,
      horarios_reuniao: formulario.horarios_reuniao.map((h, i) =>
        i === indice ? { ...h, [campo]: valor } : h
      ),
    });
  }

  function alternarConselheiro(id: string) {
    setFormulario({
      ...formulario,
      conselheiro_ids: formulario.conselheiro_ids.includes(id)
        ? formulario.conselheiro_ids.filter((c) => c !== id)
        : [...formulario.conselheiro_ids, id],
    });
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setEnviando(true);
    setErroFormulario(null);

    const payload = {
      nome: formulario.nome,
      igreja_id: Number(formulario.igreja_id),
      conselheiro_responsavel_id: formulario.conselheiro_responsavel_id
        ? Number(formulario.conselheiro_responsavel_id)
        : null,
      conselheiro_ids: formulario.conselheiro_ids.map(Number),
      horarios_reuniao: formulario.horarios_reuniao
        .filter((h) => h.dia_semana && h.horario)
        .map((h) => ({ dia_semana: h.dia_semana, horario: h.horario })),
    };

    try {
      if (editandoId) {
        await apiFetch(`/embaixadas/${editandoId}/`, {
          token,
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/embaixadas/", {
          token,
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setFormularioAberto(false);
      await carregar();
    } catch (e) {
      setErroFormulario(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(e: Embaixada) {
    if (!token) return;
    if (!window.confirm(`Excluir a embaixada "${e.nome}"? Essa ação não pode ser desfeita.`)) return;
    await apiFetch(`/embaixadas/${e.id}/`, { token, method: "DELETE" });
    await carregar();
  }

  const colunas: Coluna<Embaixada>[] = [
    { cabecalho: "Nome", render: (e) => <span className="font-medium text-text">{e.nome}</span> },
    { cabecalho: "Igreja", render: (e) => <span className="text-text-muted">{e.igreja_nome}</span> },
    {
      cabecalho: "Conselheiros",
      render: (e) => {
        // Responsável primeiro (é quem cadastra embaixadores/auxiliares),
        // depois os demais, sem repetir o nome se ele também estiver na
        // lista de conselheiros da embaixada.
        const nomes = [
          ...(e.conselheiro_responsavel_nome ? [`${e.conselheiro_responsavel_nome} (responsável)`] : []),
          ...e.conselheiro_nomes.filter((nome) => nome !== e.conselheiro_responsavel_nome),
        ];
        return (
          <span className="text-text-muted">{nomes.length > 0 ? nomes.join(", ") : "—"}</span>
        );
      },
    },
    {
      cabecalho: "Horários",
      render: (e) => (
        <span className="text-text-muted">
          {e.horarios_reuniao.length > 0
            ? e.horarios_reuniao.map((h) => `${h.dia_semana_display} ${h.horario}`).join(", ")
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Embaixadas</h1>
        <button
          onClick={abrirNovo}
          className="btn-primary"
        >
          + Nova
        </button>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Cadastro de igrejas continua pelo Django Admin — aqui só escolhe entre as já
        cadastradas.
      </p>

      {formularioAberto && (
        <form
          onSubmit={salvar}
          className="mt-6 grid gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm text-text">Nome da embaixada</label>
            <input
              required
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              className="field"
            />
          </div>

          <div>
            <label className="block text-sm text-text">Igreja</label>
            <select
              required
              value={formulario.igreja_id}
              onChange={(e) => setFormulario({ ...formulario, igreja_id: e.target.value })}
              className="field"
            >
              <option value="" disabled>
                Selecione…
              </option>
              {igrejas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-text">Conselheiro responsável</label>
            <select
              value={formulario.conselheiro_responsavel_id}
              onChange={(e) =>
                setFormulario({ ...formulario, conselheiro_responsavel_id: e.target.value })
              }
              className="field"
            >
              <option value="">Nenhum por enquanto</option>
              {conselheiros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              É quem cadastra os embaixadores e auxiliares desta embaixada.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm text-text">Outros conselheiros</label>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-border p-3">
              {conselheiros
                .filter((c) => String(c.id) !== formulario.conselheiro_responsavel_id)
                .map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-text">
                    <input
                      type="checkbox"
                      checked={formulario.conselheiro_ids.includes(String(c.id))}
                      onChange={() => alternarConselheiro(String(c.id))}
                    />
                    {c.nome}
                  </label>
                ))}
              {conselheiros.length === 0 && (
                <p className="text-xs text-text-muted">Nenhum conselheiro cadastrado ainda.</p>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Além do responsável — todos aparecem juntos no site institucional.
            </p>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm text-text">Horários de reunião</label>
              <button type="button" onClick={adicionarHorario} className="btn-ghost text-sm">
                + Adicionar horário
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {formulario.horarios_reuniao.map((h, indice) => (
                <div key={indice} className="flex items-center gap-2">
                  <select
                    value={h.dia_semana}
                    onChange={(e) => atualizarHorario(indice, "dia_semana", e.target.value)}
                    className="field"
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    required
                    value={h.horario}
                    onChange={(e) => atualizarHorario(indice, "horario", e.target.value)}
                    className="field"
                  />
                  <button
                    type="button"
                    onClick={() => removerHorario(indice)}
                    aria-label="Remover horário"
                    className="btn-ghost text-danger"
                  >
                    Remover
                  </button>
                </div>
              ))}
              {formulario.horarios_reuniao.length === 0 && (
                <p className="text-xs text-text-muted">Nenhum horário cadastrado ainda.</p>
              )}
            </div>
          </div>

          {erroFormulario && (
            <p className="sm:col-span-2 text-sm text-danger">{erroFormulario}</p>
          )}

          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="btn-primary"
            >
              {enviando ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setFormularioAberto(false)}
              className="btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <DataTable
        itens={lista}
        colunas={colunas}
        chave={(e) => e.id}
        carregando={carregando}
        erro={erro}
        mensagemVazio="Nenhuma embaixada cadastrada ainda."
        onEditar={abrirEdicao}
        onExcluir={excluir}
        rotuloEditar={(e) => `Editar ${e.nome}`}
        rotuloExcluir={(e) => `Excluir ${e.nome}`}
      />
    </div>
  );
}
