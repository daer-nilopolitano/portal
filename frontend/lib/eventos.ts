import type { TimelineItem } from "@/components/public/timeline";

type EventoAPI = {
  id: number;
  title: string;
  data_evento: string;
  local_descricao: string;
};

const TZ = "America/Sao_Paulo";

export async function getCronogramaEventos(): Promise<TimelineItem[]> {
  const params = new URLSearchParams({
    type: "cms.EventoPage",
    fields: "data_evento,local_descricao,tipo,cooperacao_externa",
    order: "data_evento",
    limit: "20",
  });
  const url = `${process.env.NEXT_PUBLIC_API_URL}/cms/pages/?${params}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error("[eventos] HTTP", res.status, url);
      return [];
    }
    const { items } = (await res.json()) as { items: EventoAPI[] };

    return items.map((e) => {
      const d = new Date(e.data_evento);
      const mes = d.toLocaleDateString("pt-BR", { month: "long", timeZone: TZ });
      return {
        rotulo: mes.charAt(0).toUpperCase() + mes.slice(1),
        data: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: TZ }),
        dataISO: d.toLocaleDateString("sv-SE", { timeZone: TZ }),
        texto: e.local_descricao ? `${e.title} — ${e.local_descricao}` : e.title,
      };
    });
  } catch (err) {
    console.error("[eventos] falha ao buscar", url, err);
    return [];
  }
}

