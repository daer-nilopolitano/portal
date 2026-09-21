import type { BlockOf } from "../../_lib/types";
import { Inline } from "./Inline";

export default function ListBlock({ block }: { block: BlockOf<"list"> }) {
  const Tag = block.ordered ? "ol" : "ul";
  return (
    <Tag className={block.ordered ? "c-list c-list--ordered" : "c-list"}>
      {block.items.map((item, i) => (
        <li key={i}>
          <Inline text={item} />
        </li>
      ))}
    </Tag>
  );
}
