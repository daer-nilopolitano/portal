// Textos e links das embaixadas, compartilhados pela seção da home, pelo carrossel e pela página /embaixadas.
import type { EmbaixadaDestaque, Igreja } from "@/lib/types";

type EnderecoIgreja = Pick<Igreja, "rua" | "numero" | "complemento" | "bairro" | "municipio">;
type DestinoIgreja = Pick<Igreja, "rua" | "numero" | "bairro" | "municipio" | "latitude" | "longitude">;

export function enderecoCompleto(igreja: EnderecoIgreja) {
  return [
    [igreja.rua, igreja.numero].filter(Boolean).join(", "),
    igreja.complemento,
    igreja.bairro,
    igreja.municipio,
  ]
    .filter(Boolean)
    .join(" — ");
}

export function horariosReuniao(destaque: EmbaixadaDestaque) {
  if (destaque.horarios_reuniao.length === 0) {
    return "Horário de reunião: a definir";
  }
  const rotulo = destaque.horarios_reuniao.length > 1 ? "Reuniões" : "Reunião";
  const lista = destaque.horarios_reuniao.map((h) => `${h.dia_semana}, ${h.horario}`).join(" / ");
  return `${rotulo}: ${lista}`;
}

export function conselheirosResponsaveis(destaque: EmbaixadaDestaque) {
  if (destaque.conselheiros_nomes.length === 0) {
    return "Conselheiro: a definir";
  }
  const rotulo = destaque.conselheiros_nomes.length > 1 ? "Conselheiros" : "Conselheiro";
  return `${rotulo}: ${destaque.conselheiros_nomes.join(", ")}`;
}

// Endereço para busca nos apps de mapa (sem complemento, que atrapalha a busca).
function enderecoParaBusca(igreja: DestinoIgreja) {
  return [[igreja.rua, igreja.numero].filter(Boolean).join(", "), igreja.bairro, igreja.municipio]
    .filter(Boolean)
    .join(", ");
}

function temCoordenadas(igreja: DestinoIgreja): igreja is DestinoIgreja & { latitude: number; longitude: number } {
  return igreja.latitude !== null && igreja.longitude !== null;
}

/** Rota até a igreja no Google Maps (no celular abre o app). Usa as coordenadas; sem elas, o endereço. */
export function linkGoogleMaps(igreja: DestinoIgreja) {
  const destino = temCoordenadas(igreja) ? `${igreja.latitude},${igreja.longitude}` : enderecoParaBusca(igreja);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
}

/** Rota até a igreja no Waze. Usa as coordenadas; sem elas, o endereço. */
export function linkWaze(igreja: DestinoIgreja) {
  const parametro = temCoordenadas(igreja)
    ? `ll=${igreja.latitude},${igreja.longitude}`
    : `q=${encodeURIComponent(enderecoParaBusca(igreja))}`;
  return `https://waze.com/ul?${parametro}&navigate=yes`;
}
