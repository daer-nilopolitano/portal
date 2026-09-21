import Link from "next/link";
import { getCourses } from "./_lib/courses";

export default function CursosPage() {
  const courses = getCourses();

  return (
    <main className="c-index">
      <header className="c-index__head">
        <h1 className="c-display">Cursos</h1>
        <p className="c-subtitle">
          Estudos para conselheiros de Embaixadores do Rei, no seu ritmo e em
          qualquer tela.
        </p>
      </header>

      <ul className="c-cards">
        {courses.map((course) => {
          const published = course.status === "published";
          const content = (
            <>
              <p className="c-eyebrow">
                {published ? (course.eyebrow ?? "Curso") : "Em breve"}
              </p>
              <h2 className="c-card__title">{course.title}</h2>
              <p className="c-card__sub">{course.subtitle}</p>
              {published && (
                <p className="c-card__meta">
                  <span>{course.chapters.length} capítulos</span>
                  <span>~{course.totalMinutes} min de leitura</span>
                </p>
              )}
            </>
          );
          return (
            <li key={course.slug}>
              {published ? (
                <Link href={`/cursos/${course.slug}`} className="c-card">
                  {content}
                </Link>
              ) : (
                <div className="c-card c-card--soon">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
