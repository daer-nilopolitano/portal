import { Navigation } from "lucide-react";
import { linkGoogleMaps, linkWaze } from "@/lib/embaixadas";
import type { Igreja } from "@/lib/types";

interface Props {
  igreja: Pick<Igreja, "rua" | "numero" | "bairro" | "municipio" | "latitude" | "longitude">;
  /** Use -1 quando os botões estão fora da tela (ex.: slides escondidos do carrossel), para o Tab não passar por eles. */
  tabIndex?: number;
}

/** "Como chegar": abre a rota no Google Maps ou no Waze (no celular, direto no app instalado). */
export function ComoChegar({ igreja, tabIndex }: Props) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Navigation size={16} className="flex-shrink-0" aria-hidden="true" />
        Como chegar
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={linkGoogleMaps(igreja)}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={tabIndex}
          className="btn-outline"
        >
          Google Maps
        </a>
        <a
          href={linkWaze(igreja)}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={tabIndex}
          className="btn-ghost"
        >
          Waze
        </a>
      </div>
    </div>
  );
}
