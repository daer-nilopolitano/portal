import type { Block } from "../../_lib/types";
import { collectHeadings } from "../../_lib/text";
import CalloutBlock from "./CalloutBlock";
import HeadingBlock from "./HeadingBlock";
import ImageBlock from "./ImageBlock";
import ListBlock from "./ListBlock";
import QuizBlock from "./QuizBlock";
import QuoteBlock from "./QuoteBlock";
import ReferenceBlock from "./ReferenceBlock";
import SummaryBlock from "./SummaryBlock";
import TableBlock from "./TableBlock";
import TextBlock from "./TextBlock";
import TimelineBlock from "./TimelineBlock";
import VideoBlock from "./VideoBlock";

/** Recebe a lista de blocos do JSON e escolhe o componente certo para cada um. */
export default function BlockRenderer({ blocks, courseSlug }: { blocks: Block[]; courseSlug: string }) {
  const headingIds = new Map(collectHeadings(blocks).map((h) => [h.index, h.id]));

  return (
    <div className="c-blocks">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return <HeadingBlock key={i} block={block} id={headingIds.get(i) ?? `secao-${i}`} />;
          case "text":
            return <TextBlock key={i} block={block} />;
          case "list":
            return <ListBlock key={i} block={block} />;
          case "quote":
            return <QuoteBlock key={i} block={block} />;
          case "callout":
            return <CalloutBlock key={i} block={block} />;
          case "image":
            return <ImageBlock key={i} block={block} courseSlug={courseSlug} />;
          case "video":
            return <VideoBlock key={i} block={block} courseSlug={courseSlug} />;
          case "table":
            return <TableBlock key={i} block={block} />;
          case "timeline":
            return <TimelineBlock key={i} block={block} />;
          case "quiz":
            return <QuizBlock key={i} block={block} />;
          case "summary":
            return <SummaryBlock key={i} block={block} />;
          case "references":
            return <ReferenceBlock key={i} block={block} />;
          default:
            // Falha no build com uma mensagem clara em vez de renderizar algo quebrado.
            throw new Error(`[cursos] Tipo de bloco desconhecido: "${(block as { type: string }).type}" (bloco #${i + 1})`);
        }
      })}
    </div>
  );
}
