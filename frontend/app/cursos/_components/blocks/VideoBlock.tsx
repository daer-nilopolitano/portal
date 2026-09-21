import type { BlockOf } from "../../_lib/types";
import { resolveAsset } from "../../_lib/text";
import { Inline } from "./Inline";

function embedUrl(src: string): string | null {
  const youtube = src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export default function VideoBlock({ block, courseSlug }: { block: BlockOf<"video">; courseSlug: string }) {
  const embed = embedUrl(block.src);
  return (
    <figure className="c-figure">
      <div className="c-video">
        {embed ? (
          <iframe
            src={embed}
            title={block.title}
            loading="lazy"
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <video controls preload="metadata" src={resolveAsset(courseSlug, block.src)} aria-label={block.title} />
        )}
      </div>
      {block.caption && (
        <figcaption className="c-figure__caption">
          <span className="c-figure__title"><Inline text={block.caption} /></span>
        </figcaption>
      )}
    </figure>
  );
}
