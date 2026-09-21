import type { BlockOf } from "../../_lib/types";

export default function HeadingBlock({ block, id }: { block: BlockOf<"heading">; id: string }) {
  if (block.level === 3) {
    return (
      <h3 id={id} className="c-h3">
        {block.text}
      </h3>
    );
  }
  return (
    <h2 id={id} className="c-h2">
      {block.text}
    </h2>
  );
}
