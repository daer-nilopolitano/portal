"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Embaixada {
  id: number;
  nome: string;
  igreja_id: number;
  igreja_nome: string;
  conselheiro_responsavel_id: number | null;
  conselheiro_responsavel_nome: string | null;
}

interface Igreja {
  id: number;
  nome: string;
}

interface PessoaConselheiro {
  id: number;
  nome: string;
}

interface FormularioEmbaixada {
  nome: string;
  igreja_id: string;
  conselheiro_responsavel_id: string;
}

const FORMULARIO_VAZIO: FormularioEmbaixada = {
  nome: "",
  igreja_id: "",
  conselheiro_responsavel_id: "",
};

export default function PainelEmbaixadasPage() {
  const { token } = useAuth();

  const [lista, setLista] = useState<Embaixada[]>([]);
  const [igrejas, setIgrejas] = useState<Igreja[]>([]);
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
        apiFetch<Igreja[]>("/igrejas/", { token }),
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
    });
    setErroFormulario(null);
    setFormularioAberto(true);
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Embaixadas</h1>
        <button
          onClick={abrirNovo}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover"
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
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-text">Igreja</label>
            <select
              required
              value={formulario.igreja_id}
              onChange={(e) => setFormulario({ ...formulario, igreja_id: e.target.value })}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Nenhum por enquanto</option>
              {conselheiros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              Só aparecem aqui pessoas já cadastradas como conselheiro em alguma
              embaixada.
            </p>
          </div>

          {erroFormulario && (
            <p className="sm:col-span-2 text-sm text-red-600">{erroFormulario}</p>
          )}

          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-60"
            >
              {enviando ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setFormularioAberto(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-text hover:bg-surface-2"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface">
        {carregando ? (
          <p className="p-5 text-sm text-text-muted">Carregando…</p>
        ) : erro ? (
          <p className="p-5 text-sm text-red-600">{erro}</p>
        ) : lista.length === 0 ? (
          <p className="p-5 text-sm text-text-muted">Nenhuma embaixada cadastrada ainda.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Igreja</th>
                <th className="px-4 py-3">Conselheiro responsável</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-text">{e.nome}</td>
                  <td className="px-4 py-3 text-text-muted">{e.igreja_nome}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {e.conselheiro_responsavel_nome ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => abrirEdicao(e)}
                      className="mr-3 text-xs font-medium text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluir(e)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
