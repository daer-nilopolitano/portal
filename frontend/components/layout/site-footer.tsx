import { NOME_SITE, TAGLINE } from "@/lib/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="font-heading text-base font-semibold text-primary">
          {NOME_SITE}
        </p>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          {TAGLINE}.
        </p>
        <p className="mt-6 text-xs text-text-muted/70">
          © {new Date().getFullYear()} {NOME_SITE}.
        </p>
      </div>
    </footer>
  );
}
