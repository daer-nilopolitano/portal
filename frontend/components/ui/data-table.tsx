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
// Em telas menores que md a tabela vira uma lista de cartões: a primeira coluna é o título do cartão e as demais
// aparecem como "rótulo: valor" (o `className` das colunas vale só para a tabela).
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
  const [colunaTitulo, ...colunasDetalhe] = colunas;

  function renderAcoes(item: T) {
    return (
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
    );
  }

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
          <table className="hidden w-full text-left text-sm md:table">
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
                    <td className="whitespace-nowrap px-2 py-1 text-right">{renderAcoes(item)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-border md:hidden">
            {itens.map((item) => (
              <li key={chave(item)} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 break-words text-base">{colunaTitulo?.render(item)}</div>
                  {temAcoes && <div className="-mr-2 -mt-2 flex-shrink-0">{renderAcoes(item)}</div>}
                </div>
                {colunasDetalhe.length > 0 && (
                  <dl className="mt-2 space-y-1.5">
                    {colunasDetalhe.map((coluna) => (
                      <div key={coluna.cabecalho} className="flex gap-3 text-sm">
                        <dt className="w-24 flex-shrink-0 text-xs text-text-muted">{coluna.cabecalho}</dt>
                        <dd className="min-w-0 flex-1 break-words">{coluna.render(item)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-4 py-2 text-xs text-text-muted">
            {itens.length} {itens.length === 1 ? "registro" : "registros"}
          </p>
        </>
      )}
    </div>
  );
}
