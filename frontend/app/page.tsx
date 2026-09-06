export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <section className="mb-12">
        <h1 className="text-4xl font-bold text-daer-blue">DAER Nilopolitano</h1>
        <p className="mt-4 text-lg text-gray-700">
          Departamento Associacional de Embaixadores do Rei Nilopolitano.
        </p>
      </section>

      {/*
        Blocos previstos no sitemap (ver plano de desenvolvimento):
        - Notícias recentes (consumindo /api/cms/pages/?type=cms.NoticiaPage)
        - Próximos eventos (consumindo /api/cms/pages/?type=cms.EventoPage)
        - Mini-mapa das embaixadas (consumindo /api/igrejas/ do backend Django Ninja)
        Cada bloco vira um componente próprio conforme a implementação avança.
      */}
      <section className="grid gap-8 md:grid-cols-3">
        <div className="rounded-lg border border-daer-blue/20 p-6">
          <h2 className="font-semibold text-daer-blue">Notícias recentes</h2>
          <p className="mt-2 text-sm text-gray-600">Em construção.</p>
        </div>
        <div className="rounded-lg border border-daer-blue/20 p-6">
          <h2 className="font-semibold text-daer-blue">Próximos eventos</h2>
          <p className="mt-2 text-sm text-gray-600">Em construção.</p>
        </div>
        <div className="rounded-lg border border-daer-blue/20 p-6">
          <h2 className="font-semibold text-daer-blue">Nossas embaixadas</h2>
          <p className="mt-2 text-sm text-gray-600">Em construção.</p>
        </div>
      </section>
    </main>
  );
}
