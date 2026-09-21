import type { BlockOf } from "../../_lib/types";
import { Inline } from "./Inline";

export default function ReferenceBlock({ block }: { block: BlockOf<"references"> }) {
  return (
    <section className="c-refs">
      <h2 className="c-block-title">{block.title ?? "Fontes e referências"}</h2>
      <ul>
        {block.items.map((item, i) => (
          <li key={i}>
            {item.url ? (
              <a className="c-link" href={item.url} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            ) : (
              <span className="c-refs__label">{item.label}</span>
            )}
            {item.detail && (
              <span className="c-refs__detail">
                <Inline text={item.detail} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
