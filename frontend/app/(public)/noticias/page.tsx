import { NoticiaCard } from "@/components/public/noticias/noticia-card";
import { SectionTitle } from "@/components/public/section-title";
import { getNoticias } from "@/lib/noticias";

export const metadata = {
  title: "Notícias",
};

export default async function NoticiasPage() {
  const noticias = await getNoticias();
  const [destaque, ...resto] = noticias;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <SectionTitle>Notícias</SectionTitle>

      {!destaque ? (
        <p className="mt-12 text-center text-text-muted">
          Ainda não há notícias publicadas.
        </p>
      ) : (
        <div className="mt-12 space-y-10">
          <NoticiaCard noticia={destaque} destaque />

          {resto.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resto.map((noticia) => (
                <NoticiaCard key={noticia.id} noticia={noticia} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
