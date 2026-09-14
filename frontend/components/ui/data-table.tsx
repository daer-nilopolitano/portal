"use client";

import { Inbox, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

export interface Coluna<T> {
  cabecalho: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  itens: T[];
  colunas: Coluna<T>[];
  chave: (item: T) => string | number;
  carregando?: boolean;
  erro?: string | null;
  mensagemVazio?: string;
  onEditar?: (item: T) => void;
  onExcluir?: (item: T) => void;
  rotuloEditar?: (item: T) => string;
  rotuloExcluir?: (item: T) => string;
}

// Tabela padrão do painel: mesmo cabeçalho, hover/zebra nas linhas, ações em ícone
// (44px de área clicável) e estado vazio ilustrado — usada por todas as listagens
// administrativas para evitar reimplementar a mesma tabela em cada página.
export function DataTable<T>({
  itens,
  colunas,
  chave,
  carregando,
  erro,
  mensagemVazio = "Nenhum registro ainda.",
  onEditar,
  onExcluir,
  rotuloEditar,
  rotuloExcluir,
}: DataTableProps<T>) {
  const temAcoes = Boolean(onEditar || onExcluir);

  return (
    <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-surface">
      {carregando ? (
        <p className="p-5 text-sm text-text-muted">Carregando…</p>
      ) : erro ? (
        <p className="p-5 text-sm text-danger">{erro}</p>
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-12 text-center">
          <Inbox className="h-8 w-8 text-text-muted" aria-hidden="true" />
          <p className="text-sm text-text-muted">{mensagemVazio}</p>
        </div>
      ) : (
        <>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <tr>
                {colunas.map((coluna) => (
                  <th key={coluna.cabecalho} className={`px-4 py-3 ${coluna.className ?? ""}`}>
                    {coluna.cabecalho}
                  </th>
                ))}
                {temAcoes && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itens.map((item, indice) => (
                <tr
                  key={chave(item)}
                  className={`transition-colors hover:bg-surface-2 ${
                    indice % 2 === 1 ? "bg-surface-2/40" : ""
                  }`}
                >
                  {colunas.map((coluna) => (
                    <td key={coluna.cabecalho} className={`px-4 py-3 ${coluna.className ?? ""}`}>
                      {coluna.render(item)}
                    </td>
                  ))}
                  {temAcoes && (
                    <td className="whitespace-nowrap px-2 py-1 text-right">
                      <div className="flex justify-end">
                        {onEditar && (
                          <button
                            onClick={() => onEditar(item)}
                            aria-label={rotuloEditar ? rotuloEditar(item) : "Editar"}
                            title="Editar"
                            className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {onExcluir && (
                          <button
                            onClick={() => onExcluir(item)}
                            aria-label={rotuloExcluir ? rotuloExcluir(item) : "Excluir"}
                            title="Excluir"
                            className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-4 py-2 text-xs text-text-muted">
            {itens.length} {itens.length === 1 ? "registro" : "registros"}
          </p>
        </>
      )}
    </div>
  );
}
