export interface TimelineItem {
  data: string;
  texto: string;
  /** Rótulo curto opcional (ex.: mês) — usado no cronograma, não na história. */
  rotulo?: string;
}

export function Timeline({
  items,
  className = "",
}: {
  items: TimelineItem[];
  className?: string;
}) {
  return (
    <ol className={`relative border-l-2 border-daer-blue/25 pl-8 ${className}`}>
      {items.map((item, indice) => (
        <li key={indice} className="relative mb-10 last:mb-0">
          <span className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-2 border-daer-blue bg-daer-yellow" />
          {item.rotulo && (
            <p className="text-xs font-semibold uppercase tracking-wide text-daer-blue-light">
              {item.rotulo}
            </p>
          )}
          <p className="font-heading text-base font-semibold text-daer-blue">{item.data}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.texto}</p>
        </li>
      ))}
    </ol>
  );
}
