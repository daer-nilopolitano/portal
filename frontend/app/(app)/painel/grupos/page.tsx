"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { revalidarTudo, useApi } from "@/lib/use-api";
import type { GrupoTrabalho, Membro } from "@/lib/types";

type MembroOpcao = Pick<Membro, "id" | "nome" | "tipo">;

export default function PainelGruposPage() {
  const { token, membro: membroLogado } = useAuth();
  const ehDiretoria = !!membroLogado?.cargo_diretoria;

  const { data: gruposCarregados, isLoading: carregando, error: erroCarga } =
    useApi<GrupoTrabalho[]>("/grupos/");
  // Só conselheiro (diretoria ou líder de algum grupo) pode gerenciar —
  // busca a lista de candidatos só nesse caso.
  const { data: membrosCarregados } = useApi<MembroOpcao[]>(
    membroLogado?.tipo === "conselheiro" ? "/membros/" : null
  );
  const grupos = gruposCarregados ?? [];
  const membros = (membrosCarregados ?? []).filter(
    (m) => m.tipo === "conselheiro" || m.tipo === "auxiliar"
  );
  const erro = erroCarga ? "Não foi possível carregar os grupos." : null;

  const [grupoAbertoId, setGrupoAbertoId] = useState<number | null>(null);
  const [membroSelecionado, setMembroSelecionado] = useState("");
  const [papelSelecionado, setPapelSelecionado] = useState<"lider" | "membro">("membro");
  const [enviando, setEnviando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);

  function podeGerenciar(grupo: GrupoTrabalho): boolean {
    if (ehDiretoria) return true;
    return grupo.participantes.some(
      (p) => p.membro_id === membroLogado?.membro_id && p.papel_no_grupo === "lider"
    );
  }

  function abrirAdicionar(grupoId: number) {
    setGrupoAbertoId(grupoId);
    setMembroSelecionado("");
    setPapelSelecionado("membro");
    setErroFormulario(null);
  }

  async function adicionarParticipante(grupoId: number) {
    if (!token || !membroSelecionado) return;
    setEnviando(true);
    setErroFormulario(null);
    try {
      await apiFetch(`/grupos/${grupoId}/membros/`, {
        token,
        method: "PUT",
        body: JSON.stringify({ membro_id: Number(membroSelecionado), papel_no_grupo: papelSelecionado }),
      });
      setGrupoAbertoId(null);
      await revalidarTudo();
    } catch (e) {
      setErroFormulario(e instanceof Error ? e.message : "Erro ao adicionar participante.");
    } finally {
      setEnviando(false);
    }
  }

  async function removerParticipante(grupoId: number, membroId: number) {
    if (!token) return;
    if (!window.confirm("Remover este participante do grupo?")) return;
    await apiFetch(`/grupos/${grupoId}/membros/${membroId}/`, { token, method: "DELETE" });
    await revalidarTudo();
  }

  async function alternarLideranca(grupoId: number, membroId: number, papelAtual: "lider" | "membro") {
    if (!token) return;
    const novoPapel = papelAtual === "lider" ? "membro" : "lider";
    try {
      await apiFetch(`/grupos/${grupoId}/membros/`, {
        token,
        method: "PUT",
        body: JSON.stringify({ membro_id: membroId, papel_no_grupo: novoPapel }),
      });
      await revalidarTudo();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  if (carregando) return <p className="text-sm text-text-muted">Carregando…</p>;
  if (erro) return <p className="text-sm text-danger">{erro}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">Grupos de Trabalho</h1>
      <p className="mt-1 text-sm text-text-muted">
        Criar ou renomear um grupo é feito pelo Django Admin — aqui você gerencia quem participa.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {grupos.map((grupo) => {
          const gerencia = podeGerenciar(grupo);
          const lider = grupo.participantes.find((p) => p.papel_no_grupo === "lider");
          const membrosComuns = grupo.participantes.filter((p) => p.papel_no_grupo === "membro");
          const idsNoGrupo = grupo.participantes.map((p) => p.membro_id);

          return (
            <div key={grupo.id} className="rounded-lg border border-border bg-surface p-5">
              <h2 className="font-heading text-lg font-semibold text-primary">{grupo.nome}</h2>

              <p className="mt-3 text-sm text-text">
                <span className="font-medium">Líder:</span>{" "}
                {lider ? (
                  <>
                    {lider.membro_nome}
                    {gerencia && (
                      <button
                        onClick={() => removerParticipante(grupo.id, lider.membro_id)}
                        className="ml-2 text-xs text-danger underline underline-offset-2"
                      >
                        remover
                      </button>
                    )}
                  </>
                ) : (
                  "— nenhum líder definido"
                )}
              </p>

              <div className="mt-3">
                <p className="text-sm font-medium text-text">Membros:</p>
                {membrosComuns.length === 0 ? (
                  <p className="text-sm text-text-muted">Nenhum membro ainda.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {membrosComuns.map((p) => (
                      <li
                        key={p.membro_id}
                        className="flex items-center justify-between text-sm text-text-muted"
                      >
                        {p.membro_nome}
                        {gerencia && (
                          <span className="flex gap-2">
                            <button
                              onClick={() => alternarLideranca(grupo.id, p.membro_id, p.papel_no_grupo)}
                              className="text-xs text-primary underline underline-offset-2"
                            >
                              tornar líder
                            </button>
                            <button
                              onClick={() => removerParticipante(grupo.id, p.membro_id)}
                              className="text-xs text-danger underline underline-offset-2"
                            >
                              remover
                            </button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {gerencia && (
                <div className="mt-4 border-t border-border pt-3">
                  {grupoAbertoId === grupo.id ? (
                    <div className="space-y-2">
                      <select
                        value={membroSelecionado}
                        onChange={(e) => setMembroSelecionado(e.target.value)}
                        className="field"
                      >
                        <option value="" disabled>
                          Selecione um membro…
                        </option>
                        {membros
                          .filter((m) => !idsNoGrupo.includes(m.id))
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nome} ({m.tipo === "conselheiro" ? "Conselheiro" : "Auxiliar"})
                            </option>
                          ))}
                      </select>
                      <select
                        value={papelSelecionado}
                        onChange={(e) => setPapelSelecionado(e.target.value as "lider" | "membro")}
                        className="field"
                      >
                        <option value="membro">Membro</option>
                        <option value="lider">Líder</option>
                      </select>
                      {erroFormulario && <p className="text-sm text-danger">{erroFormulario}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => adicionarParticipante(grupo.id)}
                          disabled={enviando || !membroSelecionado}
                          className="btn-primary text-sm"
                        >
                          {enviando ? "Adicionando…" : "Adicionar"}
                        </button>
                        <button onClick={() => setGrupoAbertoId(null)} className="btn-ghost text-sm">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => abrirAdicionar(grupo.id)} className="btn-ghost text-sm">
                      + Adicionar participante
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
