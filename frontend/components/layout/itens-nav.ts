import {
  Award,
  BookOpen,
  Building2,
  CreditCard,
  FolderOpen,
  Landmark,
  Layers,
  LayoutDashboard,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Tipo } from "@/lib/auth-context";

export interface ItemNav {
  href: string;
  rotulo: string;
  /** Rótulo curto para a barra inferior do celular (cabe em ~70px). */
  rotuloCurto?: string;
  icone: LucideIcon;
  papeis: Tipo[];
  /** Quanto menor, mais cedo o item entra na barra inferior (só os 4 primeiros do membro aparecem; o resto vai para "Mais"). */
  prioridadeBarra: number;
}

export const ITENS_NAV: ItemNav[] = [
  { href: "/painel", rotulo: "Painel", icone: LayoutDashboard, prioridadeBarra: 1, papeis: ["conselheiro", "auxiliar", "embaixador_do_rei"] },
  { href: "/painel/embaixadas", rotulo: "Embaixadas", icone: Building2, prioridadeBarra: 4, papeis: ["conselheiro"] },
  { href: "/painel/consulados", rotulo: "Consulados", icone: Landmark, prioridadeBarra: 8, papeis: ["conselheiro"] },
  { href: "/painel/conselheiros", rotulo: "Conselheiros", icone: UserCheck, prioridadeBarra: 9, papeis: ["conselheiro", "auxiliar"] },
  { href: "/painel/auxiliares", rotulo: "Auxiliares", icone: UserCog, prioridadeBarra: 10, papeis: ["conselheiro", "auxiliar"] },
  { href: "/painel/embaixadores", rotulo: "Embaixadores", icone: Users, prioridadeBarra: 3, papeis: ["conselheiro", "auxiliar"] },
  { href: "/painel/diretoria", rotulo: "Diretoria", icone: Award, prioridadeBarra: 7, papeis: ["conselheiro", "auxiliar", "embaixador_do_rei"] },
  { href: "/painel/grupos", rotulo: "Grupos", icone: Layers, prioridadeBarra: 11, papeis: ["conselheiro"] },
  { href: "/minha-carteirinha", rotulo: "Minha carteirinha", rotuloCurto: "Carteirinha", icone: CreditCard, prioridadeBarra: 2, papeis: ["embaixador_do_rei"] },
  { href: "/painel/materiais", rotulo: "Materiais", icone: FolderOpen, prioridadeBarra: 6, papeis: ["conselheiro", "auxiliar", "embaixador_do_rei"] },
  { href: "/cursos", rotulo: "Cursos", icone: BookOpen, prioridadeBarra: 5, papeis: ["conselheiro", "auxiliar"] },
];

export function itensDoTipo(tipo: Tipo | null | undefined): ItemNav[] {
  if (!tipo) return [];
  return ITENS_NAV.filter((item) => item.papeis.includes(tipo));
}

/**
 * Separa os itens do membro entre os que ficam na barra inferior (os `max` de menor prioridade) e os que vão para
 * "Mais". Os extras mantêm a ordem original do menu.
 */
export function dividirParaBarra(itens: ItemNav[], max = 4): { principais: ItemNav[]; extras: ItemNav[] } {
  const principais = [...itens].sort((a, b) => a.prioridadeBarra - b.prioridadeBarra).slice(0, max);
  const extras = itens.filter((item) => !principais.includes(item));
  return { principais, extras };
}

/** `/painel` só fica ativo na própria página (as outras rotas começam com ele); as demais valem também para subrotas. */
export function rotaAtiva(pathname: string, href: string): boolean {
  if (href === "/painel") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
