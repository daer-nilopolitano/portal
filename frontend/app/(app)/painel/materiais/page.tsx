import { ExternalLink } from "lucide-react";

interface CategoriaMaterial {
  categoria: string;
  url: string;
}

// Lista estática — atualizar aqui direto quando os links do Drive mudarem
// (decisão registrada: não vale a complexidade de um backend pra isso agora).
const MATERIAIS: CategoriaMaterial[] = [
  { categoria: "Logos", url: "https://drive.google.com/drive/folders/18PzKDQUIpIW6ndZZpP6WiFznBVosB39D?usp=sharing" },
  { categoria: "Músicas", url: "https://drive.google.com/drive/folders/1GyvVRNQkifvQyjNpjPg0qz-O-JCCL_Qy?usp=sharing" },
  { categoria: "Provas", url: "https://drive.google.com/drive/folders/1LxIlHxXD44-1974ESdbUtJAQFzAqmxoE?usp=sharing" },
  { categoria: "Modelos de documentos", url: "https://drive.google.com/drive/folders/1Tve4r1wMkUkJTXdCO2ZBmy2ExprL7pn4?usp=sharing" },
  { categoria: "Curso de conselheiros", url: "https://drive.google.com/drive/folders/1X9e3gp8br_Bw8zSb8lHoBHCa8hmqqyaf?usp=sharing" },
  { categoria: "Manuais", url: "https://drive.google.com/drive/folders/1Zdo4mNuFD6qAtuRfYwUiVIjzIIhkVc-s?usp=sharing" },
  { categoria: "Material de estudo", url: "https://drive.google.com/drive/folders/1_dJUPDka3NxENxZiR17OK4Jc0OkHKH36?usp=sharing" },
  { categoria: "Livros", url: "https://drive.google.com/drive/folders/1hVYONFWpivCSLPZWyi_gGOHwcEpTEZEQ?usp=sharing" },
  { categoria: "Questionários", url: "https://drive.google.com/drive/folders/1peZd6OQBCi9mvmZxhCg9HCeoKSzXVjjp?usp=sharing" },
  { categoria: "Fotos dos eventos", url: "https://drive.google.com/drive/folders/1zw2GYgyykAaYYoN4pkDuKWGMhNPPhhm_?usp=sharing" },
];

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
