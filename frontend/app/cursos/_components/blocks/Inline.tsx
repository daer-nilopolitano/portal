import { Fragment } from "react";

/**
 * Formatação inline mínima para textos vindos do JSON:
 *   **negrito**   *itálico*   [texto](https://link)
 * Sem dangerouslySetInnerHTML: o conteúdo nunca vira HTML cru.
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (!part) return null;
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        const link = LINK.exec(part);
        if (link && /^(https?:\/\/|\/|#|mailto:)/.test(link[2])) {
          const external = /^https?:/.test(link[2]);
          return (
            <a
              key={i}
              className="c-link"
              href={link[2]}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {link[1]}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
