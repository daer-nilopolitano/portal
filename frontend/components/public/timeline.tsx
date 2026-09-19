export interface TimelineItem {
  data: string;
  texto: string;
  rotulo?: string;
  /** Opcional — só pra permitir cálculo (ex.: "próximo evento" no painel). Exibição continua usando `data`. */
  dataISO?: string;
}

export function Timeline({ items, className = "" }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={`relative border-l-2 border-dashed border-border pl-8 ${className}`}>
      {items.map((item, indice) => (
        <li key={indice} className="relative mb-10 last:mb-0">
          <span className="absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-2 border-accent bg-surface" />
          {item.rotulo && (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">{item.rotulo}</p>
          )}
          <p className="font-heading text-base font-semibold text-primary">{item.data}</p>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">{item.texto}</p>
        </li>
      ))}
    </ol>
  );
}
