"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Igreja } from "@/lib/types";

// Subconjunto de `Igreja` com os campos que o mapa realmente usa — derivado
// do tipo compartilhado em vez de reescrito à mão (evitava ser uma 3ª
// versão divergente de "Igreja" só pra isso).
export type IgrejaMapa = Pick<Igreja, "id" | "nome" | "municipio" | "bairro" | "latitude" | "longitude">;

const COR_PIN = "rgb(var(--color-primary))";
const COR_PIN_SELECIONADO = "rgb(var(--color-accent))";

function criarIcone(selecionado: boolean) {
  const largura = selecionado ? 36 : 28;
  const altura = selecionado ? 46 : 36;
  const cor = selecionado ? COR_PIN_SELECIONADO : COR_PIN;
  const brilho = selecionado
    ? `filter: drop-shadow(0 0 6px rgb(var(--color-accent) / 0.7));`
    : "";
  return L.divIcon({
    className: "",
    html: `
      <svg width="${largura}" height="${altura}" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg" style="${brilho}">
        <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="${cor}" stroke="white" stroke-width="1.5" />
        <circle cx="14" cy="14" r="5" fill="white" />
      </svg>
    `,
    iconSize: [largura, altura],
    iconAnchor: [largura / 2, altura],
    popupAnchor: [0, -altura + 4],
  });
}

const ICONE_PADRAO = criarIcone(false);
const ICONE_SELECIONADO = criarIcone(true);

const CENTRO_PADRAO: [number, number] = [-22.8064, -43.4203];

// Componente auxiliar (sem visual próprio) - usado para ter acesso à instância do mapa via useMap e centralizar na igreja.
function CentralizarEmSelecao({
  igreja,
}: {
  igreja: (IgrejaMapa & { latitude: number; longitude: number }) | undefined;
}) {
  const map = useMap();
  useEffect(() => {
    if (igreja) {
      map.flyTo([igreja.latitude, igreja.longitude], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }
  }, [igreja, map]);
  return null;
}

// Sem visual próprio. Liga/desliga a interação conforme `interativo` (as opções do MapContainer só valem na criação,
// então isto roda pelo objeto do mapa) e recalcula o tamanho quando o contêiner muda de altura/largura.
function ControleDeInteracao({ interativo }: { interativo: boolean }) {
  const map = useMap();

  useEffect(() => {
    const manipuladores = [map.dragging, map.touchZoom, map.doubleClickZoom, map.boxZoom, map.keyboard];
    manipuladores.forEach((m) => (interativo ? m.enable() : m.disable()));

    if (!interativo) return;
    const zoom = L.control.zoom({ position: "topleft" });
    zoom.addTo(map);
    return () => {
      zoom.remove();
    };
  }, [interativo, map]);

  useEffect(() => {
    const observador = new ResizeObserver(() => map.invalidateSize());
    observador.observe(map.getContainer());
    return () => observador.disconnect();
  }, [map]);

  return null;
}

interface Props {
  igrejas: IgrejaMapa[];
  igrejaSelecionadaId: number | null;
  onSelecionarIgreja: (id: number) => void;
  /** Com `false` o mapa não arrasta nem dá zoom (útil no celular, onde ele prenderia a rolagem da página). */
  interativo?: boolean;
}

export function EmbaixadasMapaInterno({ igrejas, igrejaSelecionadaId, onSelecionarIgreja, interativo = false }: Props) {
  const comCoordenadas = igrejas.filter(
    (igreja): igreja is IgrejaMapa & { latitude: number; longitude: number } =>
      igreja.latitude !== null && igreja.longitude !== null
  );

  const centro: [number, number] =
    comCoordenadas.length > 0 ? [comCoordenadas[0].latitude, comCoordenadas[0].longitude] : CENTRO_PADRAO;

  const igrejaSelecionada = comCoordenadas.find((igreja) => igreja.id === igrejaSelecionadaId);

  return (
    <MapContainer center={centro} zoom={13} scrollWheelZoom={false} zoomControl={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ControleDeInteracao interativo={interativo} />
      <CentralizarEmSelecao igreja={igrejaSelecionada} />
      {comCoordenadas.map((igreja) => (
        <Marker
          key={igreja.id}
          position={[igreja.latitude, igreja.longitude]}
          icon={igreja.id === igrejaSelecionadaId ? ICONE_SELECIONADO : ICONE_PADRAO}
          eventHandlers={{ click: () => onSelecionarIgreja(igreja.id) }}
        >
          <Popup>
            <strong>{igreja.nome}</strong>
            <br />
            {igreja.bairro}, {igreja.municipio}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
