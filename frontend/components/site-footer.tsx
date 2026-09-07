export function SiteFooter() {
  return (
    <footer className="bg-daer-blue text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="font-heading text-base font-semibold">DAER Nilopolitano</p>
        <p className="mt-2 max-w-md text-sm text-white/80">
          Departamento Associacional de Embaixadores do Rei Nilopolitano.
        </p>
        <p className="mt-6 text-xs text-white/60">
          © {new Date().getFullYear()} DAER Nilopolitano.
        </p>
      </div>
    </footer>
  );
}
