"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ROTULO_FAIXA_ETARIA } from "@/lib/labels";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import type { Membro, Embaixada as EmbaixadaCompleta } from "@/lib/types";

// Esta tela só usa id/nome de Embaixada (pra popular o <select>)
type Embaixada = Pick<EmbaixadaCompleta, "id" | "nome">;

interface FormularioMembro {
  nome: string;
  data_nascimento: string;
  telefone_contato: string;
  email: string;
  nome_responsavel: string;
  telefone_responsavel: string;
  embaixada_id: string;
  ativo: boolean;
}

const FORMULARIO_VAZIO: FormularioMembro = {
  nome: "",
  data_nascimento: "",
  telefone_contato: "",
  email: "",
  nome_responsavel: "",
  telefone_responsavel: "",
  embaixada_id: "",
  ativo: true,
};

export function MembrosPorPapel({
  papel,
  titulo,
}: {
  papel: "conselheiro" | "embaixador_do_rei";
  titulo: string;
}) {
  const { token, membro: membroLogado } = useAuth();
  const ehDiretoria = membroLogado?.papel === "diretoria";
  const mostraResponsavel = papel === "embaixador_do_rei";

  const [lista, setLista] = useState<Membro[]>([]);
  const [embaixadas, setEmbaixadas] = useState<Embaixada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<FormularioMembro>(FORMULARIO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await apiFetch<Membro[]>(`/membros/?papel=${papel}`, { token });
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
      embaixada_id: ehDiretoria ? "" : String(membroLogado?.embaixada_id ?? ""),
    });
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(m: Membro) {
    setEditandoId(m.id);
    setFormulario({
      nome: m.nome,
      data_nascimento: m.data_nascimento,
      telefone_contato: m.telefone_contato,
      email: m.email ?? "",
      nome_responsavel: m.nome_responsavel,
      telefone_responsavel: m.telefone_responsavel,
      embaixada_id: String(m.embaixada_id),
      ativo: m.ativo,
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
        await apiFetch(`/membros/${editandoId}/`, {
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
          : membroLogado?.embaixada_id;
        const novoMembro = await apiFetch<Membro>("/membros/", {
          token,
          method: "POST",
          body: JSON.stringify({ ...payloadBase, embaixada_id: embaixadaId }),
        });
        // Papel só é atribuído na criação — editar papel de alguém já existente
        // é uma ação mais sensível (feita direto no Django Admin por enquanto).
        await apiFetch("/papeis/", {
          token,
          method: "POST",
          body: JSON.stringify({
            membro_id: novoMembro.id,
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

  async function excluir(m: Membro) {
    if (!token) return;
    if (!window.confirm(`Excluir ${m.nome}? Essa ação não pode ser desfeita.`)) return;
    await apiFetch(`/membros/${m.id}/`, { token, method: "DELETE" });
    await carregar();
  }

  async function criarAcesso(m: Membro) {
    if (!token) return;
    if (!m.email) {
      window.alert("Cadastre um e-mail para esse membro antes de criar o acesso.");
      return;
    }
    const senha = window.prompt(`Senha inicial para ${m.nome}:`);
    if (!senha) return;
    try {
      await apiFetch(`/membros/${m.id}/criar-acesso/`, {
        token,
        method: "POST",
        body: JSON.stringify({ senha }),
      });
      await carregar();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao criar acesso.");
    }
  }

  const colunas: Coluna<Membro>[] = [
    { cabecalho: "Nome", render: (m) => <span className="font-medium text-text">{m.nome}</span> },
    { cabecalho: "Embaixada", render: (m) => <span className="text-text-muted">{m.embaixada_nome}</span> },
    ...(mostraResponsavel
      ? [
          {
            cabecalho: "Faixa etária",
            render: (m: Membro) => (
              <span className="text-text-muted">
                {m.faixa_etaria ? ROTULO_FAIXA_ETARIA[m.faixa_etaria] : "—"}
              </span>
            ),
          },
        ]
      : []),
    {
      cabecalho: "Acesso",
      render: (m) =>
        m.tem_acesso ? (
          <span className="text-xs text-success">Criado</span>
        ) : (
          <button
            onClick={() => criarAcesso(m)}
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            Criar acesso
          </button>
        ),
    },
    {
      cabecalho: "Status",
      render: (m) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            m.ativo ? "bg-success/10 text-success" : "bg-surface-2 text-text-muted"
          }`}
        >
          {m.ativo ? "Ativo" : "Inativo"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{titulo}</h1>
        <button
          onClick={abrirNovo}
          className="btn-primary"
        >
          + Novo
        </button>
      </div>

      {formularioAberto && (
        <form
          onSubmit={salvar}
          className="mt-6 grid gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm text-text">Nome</label>
            <input
              required
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              className="field"
            />
          </div>

          <div>
            <label className="block text-sm text-text">Data de nascimento</label>
            <input
              required
              type="date"
              value={formulario.data_nascimento}
              onChange={(e) => setFormulario({ ...formulario, data_nascimento: e.target.value })}
              className="field"
            />
          </div>

          <div>
            <label className="block text-sm text-text">Telefone</label>
            <input
              value={formulario.telefone_contato}
              onChange={(e) => setFormulario({ ...formulario, telefone_contato: e.target.value })}
              className="field"
            />
          </div>

          <div>
            <label className="block text-sm text-text">E-mail</label>
            <input
              type="email"
              value={formulario.email}
              onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
              className="field"
            />
          </div>

          {mostraResponsavel && (
            <>
              <div>
                <label className="block text-sm text-text">Nome do responsável</label>
                <input
                  value={formulario.nome_responsavel}
                  onChange={(e) =>
                    setFormulario({ ...formulario, nome_responsavel: e.target.value })
                  }
                  className="field"
                />
              </div>
              <div>
                <label className="block text-sm text-text">Telefone do responsável</label>
                <input
                  value={formulario.telefone_responsavel}
                  onChange={(e) =>
                    setFormulario({ ...formulario, telefone_responsavel: e.target.value })
                  }
                  className="field"
                />
              </div>
            </>
          )}

          {ehDiretoria && (
            <div>
              <label className="block text-sm text-text">Embaixada</label>
              <select
                required
                value={formulario.embaixada_id}
                onChange={(e) => setFormulario({ ...formulario, embaixada_id: e.target.value })}
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
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={formulario.ativo}
              onChange={(e) => setFormulario({ ...formulario, ativo: e.target.checked })}
            />
            Ativo
          </label>

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
        chave={(m) => m.id}
        carregando={carregando}
        erro={erro}
        mensagemVazio="Nenhum registro ainda."
        onEditar={abrirEdicao}
        onExcluir={excluir}
        rotuloEditar={(m) => `Editar ${m.nome}`}
        rotuloExcluir={(m) => `Excluir ${m.nome}`}
      />
    </div>
  );
}
