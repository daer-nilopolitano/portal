import type { BlockOf, CalloutVariant } from "../../_lib/types";
import { Inline } from "./Inline";

const LABELS: Record<CalloutVariant, string> = {
  important: "Importante",
  note: "Nota",
  attention: "Atenção",
  counselor: "Para o conselheiro",
};

export default function CalloutBlock({ block }: { block: BlockOf<"callout"> }) {
  const variant = block.variant ?? "note";
  return (
    <aside className={`c-callout c-callout--${variant}`}>
      <p className="c-callout__label">{LABELS[variant]}</p>
      {block.title && <p className="c-callout__title">{block.title}</p>}
      {block.content.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i} className="c-callout__text">
          <Inline text={paragraph} />
        </p>
      ))}
    </aside>
  );
}
