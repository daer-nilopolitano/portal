export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="font-heading text-base font-semibold text-primary">
          DAER Nilopolitano
        </p>
        <p className="mt-2 max-w-md text-sm text-text-muted">
          Departamento Associacional de Embaixadores do Rei Nilopolitano.
        </p>
        <p className="mt-6 text-xs text-text-muted/70">
          © {new Date().getFullYear()} DAER Nilopolitano.
        </p>
      </div>
    </footer>
  );
}
