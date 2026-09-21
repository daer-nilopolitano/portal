import type { BlockOf } from "../../_lib/types";
import { Inline } from "./Inline";

export default function SummaryBlock({ block }: { block: BlockOf<"summary"> }) {
  return (
    <section className="c-summary">
      <p className="c-label">Resumo</p>
      <h2 className="c-block-title">{block.title ?? "Pontos-chave do capítulo"}</h2>
      <ol>
        {block.items.map((item, i) => (
          <li key={i}>
            <p>
              {item.title && <strong>{item.title}: </strong>}
              <Inline text={item.text} />
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
