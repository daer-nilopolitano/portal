import "server-only";
import sanitizeHtml from "sanitize-html";

/** Limpa o HTML vindo do CMS antes de renderizar com dangerouslySetInnerHTML. Roda só no servidor. */
export function sanitizarCorpo(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "h2", "h3", "h4",
      "ul", "ol", "li", "blockquote", "hr", "a", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
