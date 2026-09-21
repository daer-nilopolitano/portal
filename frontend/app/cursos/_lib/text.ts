import type { Block } from "./types";

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const NOT_READABLE = new Set([
  "type",
  "variant",
  "src",
  "url",
  "level",
  "width",
  "height",
  "answer",
]);

function countWords(value: unknown): number {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }
  if (Array.isArray(value))
    return value.reduce((sum: number, v) => sum + countWords(v), 0);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce(
      (sum, [key, v]) => (NOT_READABLE.has(key) ? sum : sum + countWords(v)),
      0,
    );
  }
  return 0;
}

/** Estimativa de leitura: ~180 palavras por minuto. */
export function readingMinutes(blocks: Block[]): number {
  return Math.max(1, Math.round(countWords(blocks) / 180));
}

export interface HeadingInfo {
  index: number;
  id: string;
  title: string;
  level: 2 | 3;
}

/** Gera ids únicos e estáveis para os títulos de um capítulo (usados na âncora e na barra lateral). */
export function collectHeadings(blocks: Block[]): HeadingInfo[] {
  const seen = new Map<string, number>();
  const result: HeadingInfo[] = [];
  blocks.forEach((block, index) => {
    if (block.type !== "heading") return;
    const base = slugify(block.text) || `secao-${index}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    result.push({
      index,
      id: count ? `${base}-${count + 1}` : base,
      title: block.text,
      level: block.level ?? 2,
    });
  });
  return result;
}

/**
 * "assets/foto.jpg" (relativo à pasta do curso) vira /course-assets/<curso>/foto.jpg.
 * URLs absolutas (https://... ou /caminho) passam direto.
 */
export function resolveAsset(courseSlug: string, src: string): string {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("/")) return src;
  const relative = src.replace(/^\.?\/?assets\//, "");
  return `/course-assets/${courseSlug}/${relative}`;
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}
