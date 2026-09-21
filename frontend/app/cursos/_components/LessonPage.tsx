import type { Chapter, Course } from "../_lib/types";
import BlockRenderer from "./blocks/BlockRenderer";
import ChapterNavigation, { type NavTarget } from "./ChapterNavigation";

/** Uma "aula": cabeçalho do capítulo, blocos de conteúdo e navegação. */
export default function LessonPage({
  course,
  chapter,
}: Readonly<{ course: Course; chapter: Chapter }>) {
  const index = chapter.number - 1;
  const before = course.chapters[index - 1];
  const after = course.chapters[index + 1];

  const prev: NavTarget = before
    ? {
        href: `/cursos/${course.slug}/${before.slug}`,
        label: "Capítulo anterior",
        title: before.title,
      }
    : {
        href: `/cursos/${course.slug}`,
        label: "Voltar",
        title: "Sumário do curso",
      };

  const next: NavTarget = after
    ? {
        href: `/cursos/${course.slug}/${after.slug}`,
        label: "Próximo capítulo",
        title: after.title,
      }
    : { href: "/cursos", label: "Fim do curso", title: "Ver todos os cursos" };

  return (
    <article className="c-column c-lesson">
      <header className="c-lesson__head">
        <p className="c-eyebrow">Capítulo {chapter.number}</p>
        <h1 className="c-title">{chapter.title}</h1>
        <div className="c-meta">
          <span>Por {course.author.name}</span>
          <span>~{chapter.minutes} min de leitura</span>
        </div>
        {chapter.summary && <p className="c-lede">{chapter.summary}</p>}
      </header>

      <BlockRenderer blocks={chapter.blocks} courseSlug={course.slug} />

      <ChapterNavigation prev={prev} next={next} />
    </article>
  );
}
