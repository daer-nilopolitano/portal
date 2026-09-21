import Link from "next/link";
import type { Course } from "../_lib/types";
import { pad } from "../_lib/text";

export default function CourseToc({ course }: Readonly<{ course: Course }>) {
  return (
    <section className="c-toc" aria-labelledby="c-toc-title">
      <h2 id="c-toc-title" className="c-section-title">
        Sumário
      </h2>
      <ol>
        {course.chapters.map((chapter) => (
          <li key={chapter.slug}>
            <Link
              href={`/cursos/${course.slug}/${chapter.slug}`}
              className="c-toc__row"
            >
              <span className="c-toc__num">{pad(chapter.number)}</span>
              <span className="c-toc__body">
                <span className="c-toc__title">{chapter.title}</span>
                {chapter.summary && (
                  <span className="c-toc__summary">{chapter.summary}</span>
                )}
              </span>
              <span className="c-toc__min">{chapter.minutes} min</span>
            </Link>
          </li>
        ))}
      </ol>
      {course.chapters[0] && (
        <Link
          href={`/cursos/${course.slug}/${course.chapters[0].slug}`}
          className="c-button"
        >
          Começar o curso
        </Link>
      )}
    </section>
  );
}
