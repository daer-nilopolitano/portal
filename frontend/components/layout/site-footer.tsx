import Link from "next/link";
import { EMAIL_CONTATO } from "@/lib/content/site";

const LINKS_NAVEGACAO = [
  { href: "/#sobre", rotulo: "Sobre" },
  { href: "/#embaixadores-do-rei", rotulo: "Embaixadores do Rei" },
  { href: "/#eventos", rotulo: "Eventos" },
  { href: "/#embaixadas", rotulo: "Embaixadas" },
  { href: "/noticias", rotulo: "Notícias" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-heading text-base font-semibold text-primary">
              DAER Nilopolitano
            </p>
            <p className="mt-2 max-w-xs text-sm text-text-muted">
              Departamento Associacional de Embaixadores do Rei Nilopolitano.
            </p>
          </div>

          <nav aria-label="Navegação rápida">
            <p className="text-sm font-semibold text-primary">Navegação</p>
            <ul className="mt-3 space-y-2 text-sm">
              {LINKS_NAVEGACAO.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-muted hover:text-primary"
                  >
                    {link.rotulo}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="text-text-muted hover:text-primary"
                >
                  Entrar
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-sm font-semibold text-primary">Contato</p>
            <a
              href={`mailto:${EMAIL_CONTATO}`}
              className="mt-3 inline-block text-sm text-text-muted hover:text-primary"
            >
              {EMAIL_CONTATO}
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-text-muted/70">
          <p>© {new Date().getFullYear()} DAER Nilopolitano.</p>

          <p>
            Seus dados são usados apenas para fins de identificação e gestão
            interna, em conformidade com a LGPD.{" "}
            <a
              href="https://github.com/daer-nilopolitano/site/blob/main/PRIVACIDADE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              Aviso de Privacidade
            </a>
            .
          </p>

          <p className="text-text-muted/50">
            Desenvolvido por{" "}
            <a
              href="https://portfolio-mu-henna-52.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              Alan de O. Gonçalves
            </a>{" "}
            ·{" "}
            <a
              href="https://github.com/Alan-oliveir"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              GitHub
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
