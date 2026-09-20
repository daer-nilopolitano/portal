"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { revalidarTudo, useApi } from "@/lib/use-api";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { DIAS_SEMANA } from "@/lib/labels";
import type { Embaixada, Igreja } from "@/lib/types";

// Esta tela só usa id/nome de Igreja (pra popular o <select>) — Pick evita
// puxar campos que aqui não são usados (endereço...)
type IgrejaOpcao = Pick<Igreja, "id" | "nome">;

interface FormularioHorario {
  dia_semana: string;
  horario: string;
}

interface FormularioEmbaixada {
  nome: string;
  igreja_id: string;
  horarios_reuniao: FormularioHorario[];
}

const FORMULARIO_VAZIO: FormularioEmbaixada = {
  nome: "",
  igreja_id: "",
  horarios_reuniao: [],
};

export default function PainelEmbaixadasPage() {
  const { token, membro } = useAuth();
  const ehDiretoria = !!membro?.cargo_diretoria;
  const ehConselheiro = membro?.tipo === "conselheiro";

  // As duas buscas saem em paralelo e ficam em cache: ao voltar para esta
  // tela, a lista aparece na hora e atualiza em segundo plano.
  const { data: listaCarregada, isLoading: carregando, error: erroCarga } =
    useApi<Embaixada[]>("/embaixadas/");
  const { data: igrejasCarregadas } = useApi<IgrejaOpcao[]>(ehDiretoria ? "/igrejas/" : null);
  const lista = listaCarregada ?? [];
  const igrejas = igrejasCarregadas ?? [];
  const erro = erroCarga ? "Não foi possível carregar a lista." : null;

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<FormularioEmbaixada>(FORMULARIO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  // Conselheiro comum não vê lista — cai direto no formulário da própria
  // embaixada, assim que ela chega da API.
  const minhaEmbaixada = lista.find((e) => e.id === membro?.embaixada_id) ?? null;
  useEffect(() => {
    if (ehConselheiro && !ehDiretoria && minhaEmbaixada && editandoId === null) {
      setEditandoId(minhaEmbaixada.id);
      setFormulario({
        nome: minhaEmbaixada.nome,
        igreja_id: String(minhaEmbaixada.igreja_id),
        horarios_reuniao: minhaEmbaixada.horarios_reuniao.map((h) => ({
          dia_semana: h.dia_semana,
          horario: h.horario,
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehConselheiro, ehDiretoria, minhaEmbaixada]);

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

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setEnviando(true);
    setErroFormulario(null);

    const horarios = formulario.horarios_reuniao
      .filter((h) => h.dia_semana && h.horario)
      .map((h) => ({ dia_semana: h.dia_semana, horario: h.horario }));

    // Conselheiro comum só pode mandar horários — nome/igreja ficam de fora
    // do payload de propósito, pra não disparar o 403 do backend (que
    // bloqueia esses dois campos pra quem não é Diretoria).
    const payload = ehDiretoria
      ? {
          nome: formulario.nome,
          igreja_id: Number(formulario.igreja_id),
          horarios_reuniao: horarios,
        }
      : { horarios_reuniao: horarios };

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
      await revalidarTudo();
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
    await revalidarTudo();
  }

  if (!ehDiretoria && !ehConselheiro) {
    return <p className="text-sm text-text-muted">Sem permissão para acessar esta página.</p>;
  }

  const colunas: Coluna<Embaixada>[] = [
    { cabecalho: "Nome", render: (e) => <span className="font-medium text-text">{e.nome}</span> },
    { cabecalho: "Igreja", render: (e) => <span className="text-text-muted">{e.igreja_nome}</span> },
    {
      cabecalho: "Conselheiros",
      render: (e) => (
        <span className="text-text-muted">
          {e.conselheiro_nomes.length > 0 ? e.conselheiro_nomes.join(", ") : "—"}
        </span>
      ),
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

  const camposHorarios = (
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
  );

  // Conselheiro comum: só a própria embaixada, nome/igreja somente-leitura.
  if (!ehDiretoria) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-primary">Minha embaixada</h1>
        <p className="mt-1 text-sm text-text-muted">
          Nome e igreja só podem ser alterados pela Diretoria — aqui você edita os horários de reunião.
        </p>

        {!minhaEmbaixada ? (
          <p className="mt-6 text-sm text-text-muted">Carregando…</p>
        ) : (
          <form
            onSubmit={salvar}
            className="mt-6 grid gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
          >
            <div>
              <label className="block text-sm text-text">Nome da embaixada</label>
              <p className="field bg-surface-2 text-text-muted">{formulario.nome}</p>
            </div>
            <div>
              <label className="block text-sm text-text">Igreja</label>
              <p className="field bg-surface-2 text-text-muted">{minhaEmbaixada.igreja_nome}</p>
            </div>

            {camposHorarios}

            {erroFormulario && <p className="sm:col-span-2 text-sm text-danger">{erroFormulario}</p>}

            <div className="sm:col-span-2">
              <button type="submit" disabled={enviando} className="btn-primary">
                {enviando ? "Salvando…" : "Salvar horários"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // Diretoria: lista completa + CRUD total.
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Embaixadas</h1>
        <button onClick={abrirNovo} className="btn-primary">
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

          {camposHorarios}

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
