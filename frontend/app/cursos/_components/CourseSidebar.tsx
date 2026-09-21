"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface SidebarChapter {
  slug: string;
  title: string;
  number: number;
}

export interface SidebarSection {
  id: string;
  title: string;
}

interface Props {
  courseSlug: string;
  courseTitle: string;
  authorName: string;
  chapters: SidebarChapter[];
  activeChapterSlug?: string;
  sections?: SidebarSection[];
}

const NO_SECTIONS: SidebarSection[] = [];
const pad = (n: number) => String(n).padStart(2, "0");

export default function CourseSidebar({
  courseSlug,
  courseTitle,
  authorName,
  chapters,
  activeChapterSlug,
  sections = NO_SECTIONS,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(
    sections[0]?.id ?? null,
  );
  const [progress, setProgress] = useState(0);

  const activeChapter = chapters.find(
    (chapter) => chapter.slug === activeChapterSlug,
  );

  // Destaca a seção do capítulo que está na tela.
  useEffect(() => {
    if (sections.length === 0) return;
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-8% 0px -75% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // Progresso de leitura do capítulo (barra na lateral e no topo, no celular).
  useEffect(() => {
    if (!activeChapter) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [activeChapter]);

  // Fecha o menu no celular com Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <div className="c-topbar">
        <button
          type="button"
          className="c-topbar__btn"
          aria-expanded={open}
          aria-controls="c-sidebar"
          onClick={() => setOpen((value) => !value)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
          <span>Menu do curso</span>
        </button>
        <span className="c-topbar__title">{courseTitle}</span>
        {activeChapter && (
          <span
            className="c-topbar__bar"
            style={{ transform: `scaleX(${progress})` }}
            aria-hidden="true"
          />
        )}
      </div>

      {open && (
        <button
          type="button"
          className="c-scrim"
          aria-label="Fechar o menu"
          onClick={close}
        />
      )}

      <aside
        id="c-sidebar"
        className="c-side"
        data-open={open}
        aria-label="Navegação do curso"
      >
        <Link href="/cursos" className="c-side__brand" onClick={close}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
              strokeLinejoin="round"
            />
            <path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20" strokeLinejoin="round" />
          </svg>
          Todos os cursos
        </Link>

        <Link
          href={`/cursos/${courseSlug}`}
          className="c-side__title"
          onClick={close}
        >
          {courseTitle}
        </Link>
        <p className="c-side__by">Por {authorName}</p>

        <hr className="c-side__rule" />

        {activeChapter && (
          <>
            <p className="c-side__label">Progresso da leitura</p>
            <div className="c-side__current">
              <span className="c-side__num">{pad(activeChapter.number)}</span>
              <span>{activeChapter.title}</span>
              <progress
                className="c-progress"
                max={100}
                value={Math.round(progress * 100)}
                aria-label="Progresso de leitura do capítulo"
              />
            </div>
          </>
        )}

        {sections.length > 0 && (
          <nav aria-label="Seções deste capítulo">
            <p className="c-side__label">Neste capítulo</p>
            <ul className="c-side__sections">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={
                      activeSection === section.id ? "location" : undefined
                    }
                    onClick={() => {
                      setActiveSection(section.id);
                      close();
                    }}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <hr className="c-side__rule" />

        <nav aria-label="Capítulos do curso">
          <p className="c-side__label">Capítulos ({chapters.length})</p>
          <ol className="c-side__chapters">
            {chapters.map((chapter) => (
              <li key={chapter.slug}>
                <Link
                  href={`/cursos/${courseSlug}/${chapter.slug}`}
                  aria-current={
                    chapter.slug === activeChapterSlug ? "page" : undefined
                  }
                  onClick={close}
                >
                  <span className="c-side__num">{pad(chapter.number)}</span>
                  <span>{chapter.title}</span>
                </Link>
              </li>
            ))}
          </ol>
          <Link
            href={`/cursos/${courseSlug}`}
            className="c-side__more"
            onClick={close}
          >
            Ver o sumário completo
          </Link>
        </nav>
      </aside>
    </>
  );
}
