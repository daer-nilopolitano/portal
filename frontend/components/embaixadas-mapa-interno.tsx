"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export interface IgrejaMapa {
  id: number;
  nome: string;
  municipio: string;
  bairro: string;
  latitude: number | null;
  longitude: number | null;
}

// Ícone simples (círculo azul/amarelo) em vez do marcador padrão do Leaflet —
// evita o problema clássico de bundler com os ícones PNG padrão da lib.
const icone = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#F2B705;border:2px solid #1B3A6B;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Centro aproximado de Nilópolis/RJ — usado só se nenhuma igreja tiver coordenadas ainda.
const CENTRO_PADRAO: [number, number] = [-22.8064, -43.4203];

export function EmbaixadasMapaInterno({ igrejas }: { igrejas: IgrejaMapa[] }) {
  const comCoordenadas = igrejas.filter(
    (igreja): igreja is IgrejaMapa & { latitude: number; longitude: number } =>
      igreja.latitude !== null && igreja.longitude !== null
  );

  const centro: [number, number] =
    comCoordenadas.length > 0
      ? [comCoordenadas[0].latitude, comCoordenadas[0].longitude]
      : CENTRO_PADRAO;

  return (
    <MapContainer center={centro} zoom={13} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {comCoordenadas.map((igreja) => (
        <Marker key={igreja.id} position={[igreja.latitude, igreja.longitude]} icon={icone}>
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
