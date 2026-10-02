"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { revalidarTudo, useApi } from "@/lib/use-api";
import { ROTULO_CARGO_DIRETORIA_EMBAIXADA, ROTULO_FAIXA_ETARIA, ROTULO_POSTO } from "@/lib/labels";
import { DataTable, type Coluna } from "@/components/ui/data-table";
import { ModalAcesso, type MembroAcesso } from "@/components/painel/modal-acesso";
import { ModalSenha } from "@/components/painel/modal-senha";
import type { Membro, Embaixada as EmbaixadaCompleta } from "@/lib/types";

// Esta tela só usa id/nome de Embaixada (pra popular o <select>)
type Embaixada = Pick<EmbaixadaCompleta, "id" | "nome">;

interface FormularioMembro {
  nome: string;
  data_nascimento: string;
  telefone_contato: string;
  email: string;
  posto_embaixador: string;
  cargo_embaixada: string;
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
  posto_embaixador: "escudeiro",
  cargo_embaixada: "",
  nome_responsavel: "",
  telefone_responsavel: "",
  embaixada_id: "",
  ativo: true,
};

export function MembrosPorTipo({
  tipo,
  titulo,
}: {
  tipo: "conselheiro" | "auxiliar" | "embaixador_do_rei";
  titulo: string;
}) {
  const { token, membro: membroLogado } = useAuth();
  const ehDiretoria = !!membroLogado?.cargo_diretoria;
  const ehAuxiliar = membroLogado?.tipo === "auxiliar";
  const mostraCamposEmbaixador = tipo === "embaixador_do_rei";

  const { data: listaCarregada, isLoading: carregando, error: erroCarga } =
    useApi<MembroAcesso[]>(`/membros/?tipo=${tipo}`);
  const { data: embaixadasCarregadas } = useApi<Embaixada[]>(ehDiretoria ? "/embaixadas/" : null);
  const lista = listaCarregada ?? [];
  const embaixadas = embaixadasCarregadas ?? [];
  const erro = erroCarga ? "Não foi possível carregar a lista." : null;

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<FormularioMembro>(FORMULARIO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [confirmandoSenha, setConfirmandoSenha] = useState(false);
  const [membroAcesso, setMembroAcesso] = useState<MembroAcesso | null>(null);

  // Trocar o e-mail de quem já tem acesso muda o canal de recuperação da conta: o backend exige a senha de quem edita.
  const membroEditado = editandoId ? lista.find((m) => m.id === editandoId) : undefined;
  const emailMudou = (formulario.email.trim() || null) !== (membroEditado?.email ?? null);
  const precisaConfirmarSenha = !!membroEditado?.tem_acesso && emailMudou;

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
      posto_embaixador: m.posto_embaixador ?? "escudeiro",
      cargo_embaixada: m.cargo_embaixada ?? "",
      nome_responsavel: m.nome_responsavel,
      telefone_responsavel: m.telefone_responsavel,
      embaixada_id: String(m.embaixada_id),
      ativo: m.ativo,
    });
    setErroFormulario(null);
    setFormularioAberto(true);
  }

  /** Grava o formulário. Lança erro se a API recusar (quem chama decide onde mostrar a mensagem). */
  async function persistir(senhaConfirmacao?: string) {
    const payloadBase = {
      nome: formulario.nome,
      data_nascimento: formulario.data_nascimento,
      telefone_contato: formulario.telefone_contato,
      email: formulario.email.trim() || null,
      tipo,
      ...(mostraCamposEmbaixador
        ? {
            posto_embaixador: formulario.posto_embaixador,
            nome_responsavel: formulario.nome_responsavel,
            telefone_responsavel: formulario.telefone_responsavel,
          }
        : {}),
      ativo: formulario.ativo,
    };

    let membroId = editandoId;
    if (editandoId) {
      await apiFetch(`/membros/${editandoId}/`, {
        token,
        method: "PUT",
        body: JSON.stringify({
          ...payloadBase,
          embaixada_id: Number(formulario.embaixada_id),
          ...(senhaConfirmacao ? { senha_confirmacao: senhaConfirmacao } : {}),
        }),
      });
    } else {
      const embaixadaId = ehDiretoria ? Number(formulario.embaixada_id) : membroLogado?.embaixada_id;
      const novoMembro = await apiFetch<Membro>("/membros/", {
        token,
        method: "POST",
        body: JSON.stringify({ ...payloadBase, embaixada_id: embaixadaId }),
      });
      membroId = novoMembro.id;
    }

    // Cargo no quadro de oficiais é um endpoint à parte — o backend troca
    // automaticamente o titular anterior se o cargo já estiver ocupado.
    if (mostraCamposEmbaixador && membroId) {
      await apiFetch(`/membros/${membroId}/cargo-embaixada/`, {
        token,
        method: "PUT",
        body: JSON.stringify({ cargo: formulario.cargo_embaixada || null }),
      });
    }

    setFormularioAberto(false);
    await revalidarTudo();
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!token) return;
    if (precisaConfirmarSenha) {
      setConfirmandoSenha(true);
      return;
    }
    setEnviando(true);
    setErroFormulario(null);
    try {
      await persistir();
    } catch (e) {
      setErroFormulario(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarComSenha(senha: string) {
    await persistir(senha); // se a API recusar, o erro aparece dentro da janela de senha
    setConfirmandoSenha(false);
  }

  async function excluir(m: Membro) {
    if (!token) return;
    if (!window.confirm(`Excluir ${m.nome}? Essa ação não pode ser desfeita.`)) return;
    try {
      await apiFetch(`/membros/${m.id}/`, { token, method: "DELETE" });
      await revalidarTudo();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  const colunas: Coluna<MembroAcesso>[] = [
    { cabecalho: "Nome", render: (m) => <span className="font-medium text-text">{m.nome}</span> },
    { cabecalho: "Embaixada", render: (m) => <span className="text-text-muted">{m.embaixada_nome}</span> },
    ...(mostraCamposEmbaixador
      ? [
          {
            cabecalho: "Faixa etária",
            render: (m: MembroAcesso) => (
              <span className="text-text-muted">
                {m.faixa_etaria ? ROTULO_FAIXA_ETARIA[m.faixa_etaria] : "—"}
              </span>
            ),
          },
          {
            cabecalho: "Posto",
            render: (m: MembroAcesso) => (
              <span className="text-text-muted">
                {m.posto_embaixador ? ROTULO_POSTO[m.posto_embaixador] : "—"}
              </span>
            ),
          },
          {
            cabecalho: "Cargo",
            render: (m: MembroAcesso) => (
              <span className="text-text-muted">
                {m.cargo_embaixada ? ROTULO_CARGO_DIRETORIA_EMBAIXADA[m.cargo_embaixada] : "—"}
              </span>
            ),
          },
        ]
      : []),
    {
      cabecalho: "Acesso",
      render: (m) => {
        if (!m.tem_acesso) {
          return ehAuxiliar ? (
            <span className="text-xs text-text-muted">Sem acesso</span>
          ) : (
            <button
              onClick={() => setMembroAcesso(m)}
              className="text-xs font-medium text-primary underline underline-offset-2"
            >
              Criar acesso
            </button>
          );
        }
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className={`text-xs ${m.convite_pendente ? "text-text-muted" : "text-success"}`}>
              {m.convite_pendente ? "Convite pendente" : "Criado"}
            </span>
            {/* Usuários gerados (membros sem e-mail) não são óbvios; o e-mail já é conhecido, então não repete. */}
            {m.usuario && !m.usuario.includes("@") && (
              <span className="text-xs text-text-muted">Usuário: {m.usuario}</span>
            )}
            {!ehAuxiliar && (
              <button
                onClick={() => setMembroAcesso(m)}
                className="text-xs font-medium text-primary underline underline-offset-2"
              >
                Gerenciar
              </button>
            )}
          </div>
        );
      },
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
        {!ehAuxiliar && (
          <button onClick={abrirNovo} className="btn-primary">
            + Novo
          </button>
        )}
      </div>

      {formularioAberto && !ehAuxiliar && (
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
            <p className="mt-1 text-xs text-text-muted">
              {membroEditado?.tem_acesso
                ? "Alterar o e-mail de quem já tem acesso pede a sua senha e encerra as sessões abertas dele(a)."
                : "Opcional. Sem e-mail, o acesso é criado com um usuário gerado e uma senha temporária."}
            </p>
          </div>

          {mostraCamposEmbaixador && (
            <>
              <div>
                <label className="block text-sm text-text">Posto</label>
                <select
                  value={formulario.posto_embaixador}
                  onChange={(e) => setFormulario({ ...formulario, posto_embaixador: e.target.value })}
                  className="field"
                >
                  {Object.entries(ROTULO_POSTO).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-text">Cargo no quadro de oficiais</label>
                <select
                  value={formulario.cargo_embaixada}
                  onChange={(e) => setFormulario({ ...formulario, cargo_embaixada: e.target.value })}
                  className="field"
                >
                  <option value="">Nenhum</option>
                  {Object.entries(ROTULO_CARGO_DIRETORIA_EMBAIXADA).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-text-muted">
                  Atribuir um cargo já ocupado troca o titular anterior automaticamente.
                </p>
              </div>

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
        chave={(m) => m.id}
        carregando={carregando}
        erro={erro}
        mensagemVazio="Nenhum registro ainda."
        onEditar={ehAuxiliar ? undefined : abrirEdicao}
        onExcluir={ehAuxiliar ? undefined : excluir}
        rotuloEditar={(m) => `Editar ${m.nome}`}
        rotuloExcluir={(m) => `Excluir ${m.nome}`}
      />

      {/* Fora do <form>: as janelas são irmãs dele, não filhas (form dentro de form é inválido). */}
      <ModalAcesso
        membro={membroAcesso}
        token={token}
        onFechar={() => setMembroAcesso(null)}
        onAtualizado={async () => {
          await revalidarTudo();
        }}
      />
      <ModalSenha
        aberto={confirmandoSenha}
        titulo="Confirme com a sua senha"
        descricao="Alterar o e-mail de um membro que já tem acesso muda como ele recupera a conta, então precisamos confirmar que é você."
        rotuloConfirmar="Confirmar e salvar"
        onConfirmar={confirmarComSenha}
        onFechar={() => setConfirmandoSenha(false)}
      />
    </div>
  );
}
