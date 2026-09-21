import type { BlockOf } from "../../_lib/types";
import { resolveAsset } from "../../_lib/text";
import { Inline } from "./Inline";

export default function ImageBlock({ block, courseSlug }: { block: BlockOf<"image">; courseSlug: string }) {
  return (
    <figure className="c-figure">
      <div className="c-figure__frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolveAsset(courseSlug, block.src)}
          alt={block.alt}
          width={block.width}
          height={block.height}
          loading="lazy"
          decoding="async"
        />
      </div>
      {(block.caption || block.credit) && (
        <figcaption className="c-figure__caption">
          {block.caption && <span className="c-figure__title"><Inline text={block.caption} /></span>}
          {block.credit && <span className="c-figure__credit">{block.credit}</span>}
        </figcaption>
      )}
    </figure>
  );
}
