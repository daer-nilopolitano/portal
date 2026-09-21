import type { BlockOf } from "../../_lib/types";
import { Inline } from "./Inline";

export default function TableBlock({ block }: { block: BlockOf<"table"> }) {
  return (
    <div className="c-table-wrap" role="region" aria-label={block.caption ?? "Tabela"} tabIndex={0}>
      <table className="c-table">
        {block.caption && <caption>{block.caption}</caption>}
        <thead>
          <tr>
            {block.columns.map((column, i) => (
              <th key={i} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>
                  <Inline text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
