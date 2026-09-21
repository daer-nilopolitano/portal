import Link from "next/link";

export interface NavTarget {
  href: string;
  label: string;
  title: string;
}

export default function ChapterNavigation({
  prev,
  next,
}: Readonly<{
  prev: NavTarget;
  next: NavTarget;
}>) {
  return (
    <nav className="c-chapnav" aria-label="Navegação entre capítulos">
      <Link
        href={prev.href}
        className="c-chapnav__link c-chapnav__link--prev"
        rel="prev"
      >
        <span className="c-chapnav__label">{prev.label}</span>
        <span className="c-chapnav__title">{prev.title}</span>
      </Link>
      <Link
        href={next.href}
        className="c-chapnav__link c-chapnav__link--next"
        rel="next"
      >
        <span className="c-chapnav__label">{next.label}</span>
        <span className="c-chapnav__title">{next.title}</span>
      </Link>
    </nav>
  );
}
