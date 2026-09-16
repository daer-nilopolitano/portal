import { ExternalLink } from "lucide-react";
import { MATERIAIS } from "@/lib/content/materiais";

export default function PainelMateriaisPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">Materiais</h1>
      <p className="mt-2 text-sm text-text-muted">
        Links para as pastas de arquivos do DAER Nilopolitano no Google Drive.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {MATERIAIS.map((item) => (
          <li key={item.categoria}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-sm text-text transition-colors hover:border-primary hover:text-primary"
            >
              {item.categoria}
              <ExternalLink className="h-4 w-4 text-text-muted" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
