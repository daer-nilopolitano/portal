import type { MetadataRoute } from "next";
import { NOME_SITE, TAGLINE } from "@/lib/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOME_SITE,
    short_name: NOME_SITE,
    description: TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#1E40AF",
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
