export type CalloutVariant = "important" | "note" | "attention" | "counselor";

export interface TimelineItem {
  date: string;
  title: string;
  text?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  /** Índice (começando em 0) da alternativa correta. */
  answer: number;
  explanation?: string;
}

export interface SummaryItem {
  title?: string;
  text: string;
}

export interface ReferenceItem {
  label: string;
  detail?: string;
  url?: string;
}

/**
 * Todos os tipos de bloco aceitos nos arquivos de capítulo.
 * Para criar um novo tipo: adicione aqui, crie o componente em
 * _components/blocks e registre em BlockRenderer.tsx.
 */
export type Block =
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "text"; content: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "quote"; content: string; author?: string; source?: string }
  | {
      type: "callout";
      variant?: CalloutVariant;
      title?: string;
      content: string;
    }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      credit?: string;
      width?: number;
      height?: number;
    }
  | { type: "video"; src: string; title: string; caption?: string }
  | { type: "table"; columns: string[]; rows: string[][]; caption?: string }
  | { type: "timeline"; title?: string; items: TimelineItem[] }
  | { type: "quiz"; title?: string; questions: QuizQuestion[] }
  | { type: "summary"; title?: string; items: SummaryItem[] }
  | { type: "references"; title?: string; items: ReferenceItem[] };

export type BlockOf<T extends Block["type"]> = Extract<Block, { type: T }>;

export interface Author {
  name: string;
  role?: string;
}

/** Formato de courses/<slug>/course.json */
export interface CourseFile {
  title: string;
  subtitle: string;
  eyebrow?: string;
  about?: string;
  author: Author;
  status?: "published" | "soon";
  order?: number;
  updatedAt?: string;
  /** Slugs dos capítulos, na ordem. Cada um é um arquivo em chapters/<slug>.json */
  chapters?: string[];
}

/** Formato de courses/<slug>/chapters/<capitulo>.json */
export interface ChapterFile {
  title: string;
  summary?: string;
  blocks: Block[];
}

export interface Chapter extends ChapterFile {
  slug: string;
  number: number;
  minutes: number;
}

export interface Course extends Omit<
  CourseFile,
  "chapters" | "status" | "order"
> {
  slug: string;
  status: "published" | "soon";
  order: number;
  chapters: Chapter[];
  totalMinutes: number;
}
