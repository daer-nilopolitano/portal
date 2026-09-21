import type { Course } from "../_lib/types";

export default function CourseHeader({ course }: Readonly<{ course: Course }>) {
  const initials = course.author.name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="c-course-head">
      <p className="c-eyebrow">{course.eyebrow ?? "Curso"}</p>
      <h1 className="c-display">{course.title}</h1>
      <p className="c-subtitle">{course.subtitle}</p>
      <div className="c-meta">
        <span className="c-meta__author">
          <span className="c-avatar" aria-hidden="true">
            {initials}
          </span>
          {course.author.name}
        </span>
        <span>~{course.totalMinutes} min de leitura</span>
        <span>{course.chapters.length} capítulos</span>
      </div>
    </header>
  );
}
