import Link from "next/link";
import { NoticiaCard } from "@/components/public/noticias/noticia-card";
import { SectionTitle } from "@/components/public/section-title";
import { getNoticias } from "@/lib/noticias";

export async function NoticiasSecao() {
  const noticias = await getNoticias(3);

  return (
    <section id="noticias" className="border-t border-border bg-surface-soft px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionTitle>Últimas Notícias</SectionTitle>

        {noticias.length > 0 ? (
          <>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {noticias.map((noticia) => (
                <NoticiaCard key={noticia.id} noticia={noticia} />
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/noticias" className="btn-outline">
                Ver todas as notícias
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-12 text-center text-sm text-text-muted">
            Nenhuma notícia publicada no momento.
          </p>
        )}
      </div>
    </section>
  );
}
