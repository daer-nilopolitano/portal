import type { BlockOf } from "../../_lib/types";
import { Inline } from "./Inline";

export default function TimelineBlock({ block }: { block: BlockOf<"timeline"> }) {
  return (
    <section className="c-timeline" aria-label={block.title ?? "Linha do tempo"}>
      {block.title && <h3 className="c-block-title">{block.title}</h3>}
      <ol>
        {block.items.map((item, i) => (
          <li key={i}>
            <span className="c-timeline__date">{item.date}</span>
            <div className="c-timeline__body">
              <p className="c-timeline__title">{item.title}</p>
              {item.text && (
                <p className="c-timeline__text">
                  <Inline text={item.text} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
