import type { BlockOf } from "../../_lib/types";
import { Inline } from "./Inline";

export default function TextBlock({ block }: { block: BlockOf<"text"> }) {
  const paragraphs = block.content.split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="c-text">
          <Inline text={paragraph} />
        </p>
      ))}
    </>
  );
}
