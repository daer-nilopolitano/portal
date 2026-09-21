import type { ReactNode } from "react";
import type { Course } from "../_lib/types";
import CourseSidebar, { type SidebarSection } from "./CourseSidebar";

interface Props {
  course: Course;
  activeChapterSlug?: string;
  sections?: SidebarSection[];
  children: ReactNode;
}

/** Moldura de todas as páginas de um curso: barra lateral + coluna de leitura. */
export default function CourseLayout({
  course,
  activeChapterSlug,
  sections,
  children,
}: Readonly<Props>) {
  return (
    <div className="c-shell">
      <a href="#conteudo" className="c-skip">
        Ir para o conteúdo
      </a>
      <CourseSidebar
        courseSlug={course.slug}
        courseTitle={course.title}
        authorName={course.author.name}
        chapters={course.chapters.map(({ slug, title, number }) => ({
          slug,
          title,
          number,
        }))}
        activeChapterSlug={activeChapterSlug}
        sections={sections}
      />
      <main id="conteudo" className="c-main">
        {children}
      </main>
    </div>
  );
}
