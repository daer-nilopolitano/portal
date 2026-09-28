import { AlbumCard } from "@/components/public/galeria/album-card";
import { SectionTitle } from "@/components/public/section-title";
import { getAlbuns } from "@/lib/galeria";

export const metadata = {
  title: "Galeria",
};

export default async function GaleriaPage() {
  const albuns = await getAlbuns();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <SectionTitle>Galeria de Fotos</SectionTitle>

      {albuns.length === 0 ? (
        <p className="mt-12 text-center text-text-muted">Ainda não há álbuns publicados.</p>
      ) : (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {albuns.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
    </main>
  );
}
