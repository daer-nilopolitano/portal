import Link from "next/link";

export default function CursoNotFound() {
  return (
    <main className="c-index">
      <header className="c-index__head">
        <h1 className="c-display">Página não encontrada</h1>
        <p className="c-subtitle">
          Esse curso ou capítulo não existe, ou ainda não foi publicado.
        </p>
        <Link href="/cursos" className="c-button">
          Ver todos os cursos
        </Link>
      </header>
    </main>
  );
}
