"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ROTULO_FAIXA_ETARIA } from "@/lib/labels";

interface Pessoa {
  id: number;
  nome: string;
  data_nascimento: string;
  telefone_contato: string;
  email: string | null;
  nome_responsavel: string;
  telefone_responsavel: string;
  embaixada_id: number;
  embaixada_nome: string;
  ativo: boolean;
  idade: number;
  faixa_etaria: string | null;
  tem_acesso: boolean;
}

interface Embaixada {
  id: number;
  nome: string;
}

interface FormularioPessoa {
  nome: string;
  data_nascimento: string;
  telefone_contato: string;
  email: string;
  nome_responsavel: string;
  telefone_responsavel: string;
  embaixada_id: string;
  ativo: boolean;
}

const FORMULARIO_VAZIO: FormularioPessoa = {
  nome: "",
  data_nascimento: "",
  telefone_contato: "",
  email: "",
  nome_responsavel: "",
  telefone_responsavel: "",
  embaixada_id: "",
  ativo: true,
};

export function PessoasPorPapel({
  papel,
  titulo,
}: {
  papel: "conselheiro" | "embaixador_do_rei";
  titulo: string;
}) {
  const { token, pessoa: pessoaLogada } = useAuth();
  const ehDiretoria = pessoaLogada?.papel === "diretoria";
  const mostraResponsavel = papel === "embaixador_do_rei";

  const [lista, setLista] = useState<Pessoa[]>([]);
  const [embaixadas, setEmbaixadas] = useState<Embaixada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<FormularioPessoa>(FORMULARIO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await apiFetch<Pessoa[]>(`/pessoas/?papel=${papel}`, { token });
      setLista(dados);
      if (ehDiretoria) {
        const listaEmbaixadas = await apiFetch<Embaixada[]>("/embaixadas/", { token });
        setEmbaixadas(listaEmbaixadas);
      }
    } catch {
      setErro("Não foi possível carregar a lista.");
    } finally {
      setCarregando(false);
    }
  }, [token, papel, ehDiretoria]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNovo() {
    setEditandoId(null);
    setFormulario({
      ...FORMULARIO_VAZIO,
      embaixada_id: ehDiretoria ? "" : String(pessoaLogada?.embaixada_id ?? ""),
    });
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(p: Pessoa) {
    setEditandoId(p.id);
    setFormulario({
      nome: p.nome,
      data_nascimento: p.data_nascimento,
      telefone_contato: p.telefone_contato,
      email: p.email ?? "",
      nome_responsavel: p.nome_responsavel,
      telefone_responsavel: p.telefone_responsavel,
      embaixada_id: String(p.embaixada_id),
      ativo: p.ativo,
    });
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setEnviando(true);
    setErroFormulario(null);

    const payloadBase = {
      nome: formulario.nome,
      data_nascimento: formulario.data_nascimento,
      telefone_contato: formulario.telefone_contato,
      email: formulario.email || null,
      ...(mostraResponsavel
        ? {
            nome_responsavel: formulario.nome_responsavel,
            telefone_responsavel: formulario.telefone_responsavel,
          }
        : {}),
      ativo: formulario.ativo,
    };

    try {
      if (editandoId) {
        await apiFetch(`/pessoas/${editandoId}/`, {
          token,
          method: "PUT",
          body: JSON.stringify({
            ...payloadBase,
            embaixada_id: Number(formulario.embaixada_id),
          }),
        });
      } else {
        const embaixadaId = ehDiretoria
          ? Number(formulario.embaixada_id)
          : pessoaLogada?.embaixada_id;
        const novaPessoa = await apiFetch<Pessoa>("/pessoas/", {
          token,
          method: "POST",
          body: JSON.stringify({ ...payloadBase, embaixada_id: embaixadaId }),
        });
        await apiFetch("/papeis/", {
          token,
          method: "POST",
          body: JSON.stringify({
            pessoa_id: novaPessoa.id,
            tipo: papel,
            data_inicio: new Date().toISOString().slice(0, 10),
          }),
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

  async function excluir(p: Pessoa) {
    if (!token) return;
    if (!window.confirm(`Excluir ${p.nome}? Essa ação não pode ser desfeita.`)) return;
    await apiFetch(`/pessoas/${p.id}/`, { token, method: "DELETE" });
    await carregar();
  }

  async function criarAcesso(p: Pessoa) {
    if (!token) return;
    if (!p.email) {
      window.alert("Cadastre um e-mail para essa pessoa antes de criar o acesso.");
      return;
    }
    const senha = window.prompt(`Senha inicial para ${p.nome}:`);
    if (!senha) return;
    try {
      await apiFetch(`/pessoas/${p.id}/criar-acesso/`, {
        token,
        method: "POST",
        body: JSON.stringify({ senha }),
      });
      await carregar();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao criar acesso.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-daer-blue">{titulo}</h1>
        <button
          onClick={abrirNovo}
          className="rounded-md bg-daer-blue px-4 py-2 text-sm font-medium text-white hover:bg-daer-blue-light"
        >
          + Novo
        </button>
      </div>

      {formularioAberto && (
        <form
          onSubmit={salvar}
          className="mt-6 grid gap-4 rounded-lg border border-gray-200 bg-white p-5 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm text-gray-700">Nome</label>
            <input
              required
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-daer-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700">Data de nascimento</label>
            <input
              required
              type="date"
              value={formulario.data_nascimento}
              onChange={(e) => setFormulario({ ...formulario, data_nascimento: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-daer-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700">Telefone</label>
            <input
              value={formulario.telefone_contato}
              onChange={(e) => setFormulario({ ...formulario, telefone_contato: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-daer-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700">E-mail</label>
            <input
              type="email"
              value={formulario.email}
              onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-daer-blue focus:outline-none"
            />
          </div>

          {mostraResponsavel && (
            <>
              <div>
                <label className="block text-sm text-gray-700">Nome do responsável</label>
                <input
                  value={formulario.nome_responsavel}
                  onChange={(e) =>
                    setFormulario({ ...formulario, nome_responsavel: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-daer-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Telefone do responsável</label>
                <input
                  value={formulario.telefone_responsavel}
                  onChange={(e) =>
                    setFormulario({ ...formulario, telefone_responsavel: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-daer-blue focus:outline-none"
                />
              </div>
            </>
          )}

          {ehDiretoria && (
            <div>
              <label className="block text-sm text-gray-700">Embaixada</label>
              <select
                required
                value={formulario.embaixada_id}
                onChange={(e) => setFormulario({ ...formulario, embaixada_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-daer-blue focus:outline-none"
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
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={formulario.ativo}
              onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })}
            />
            Ativo
          </label>

          {erroFormulario && (
            <p className="sm:col-span-2 text-sm text-red-600">{erroFormulario}</p>
          )}

          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-daer-blue px-4 py-2 text-sm font-medium text-white hover:bg-daer-blue-light disabled:opacity-60"
            >
              {enviando ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setFormularioAberto(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {carregando ? (
          <p className="p-5 text-sm text-gray-500">Carregando…</p>
        ) : erro ? (
          <p className="p-5 text-sm text-red-600">{erro}</p>
        ) : lista.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">Nenhum registro ainda.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Embaixada</th>
                {!mostraResponsavel ? null : <th className="px-4 py-3">Faixa etária</th>}
                <th className="px-4 py-3">Acesso</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{p.embaixada_nome}</td>
                  {!mostraResponsavel ? null : (
                    <td className="px-4 py-3 text-gray-600">
                      {p.faixa_etaria ? ROTULO_FAIXA_ETARIA[p.faixa_etaria] : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {p.tem_acesso ? (
                      <span className="text-xs text-green-700">Criado</span>
                    ) : (
                      <button
                        onClick={() => criarAcesso(p)}
                        className="text-xs font-medium text-daer-blue underline"
                      >
                        Criar acesso
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.ativo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => abrirEdicao(p)}
                      className="mr-3 text-xs font-medium text-daer-blue hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => excluir(p)}
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
