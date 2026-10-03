import type { MetadataRoute } from "next";
import { NOME_SITE, TAGLINE } from "@/lib/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOME_SITE,
    short_name: "DAERNIL",
    description: TAGLINE,
    start_url: "/",
    display: "standalone",
    // Mesmas cores de --color-background (tema claro) em globals.css; o manifest não suporta tema escuro.
    background_color: "#FAF9F6",
    theme_color: "#FAF9F6",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
