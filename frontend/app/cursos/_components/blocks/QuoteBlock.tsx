import type { BlockOf } from "../../_lib/types";
import { Inline } from "./Inline";

export default function QuoteBlock({ block }: { block: BlockOf<"quote"> }) {
  const attribution = [block.author, block.source].filter(Boolean).join(", ");
  return (
    <figure className="c-quote">
      <blockquote>
        <p>“<Inline text={block.content} />”</p>
      </blockquote>
      {attribution && <figcaption>{attribution}</figcaption>}
    </figure>
  );
}
