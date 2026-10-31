export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-slate-600 sm:flex-row sm:px-6 lg:px-8">
        <div>
          <p className="font-semibold text-slate-800">
            Faculdade de Tecnologia &ldquo;Shunji Nishimura&rdquo; — Fatec Pompeia
          </p>
          <p className="mt-0.5 text-slate-500">
            Avenida Fundação Shunji Nishimura, 605 — Distrito Industrial, Pompeia/SP
          </p>
        </div>
        <div className="text-center sm:text-right">
          <p>Projeto Integrador — CST em Sistemas Inteligentes</p>
          <p className="mt-0.5 text-slate-500">Centro Paula Souza (CEETEPS)</p>
        </div>
      </div>
    </footer>
  );
}
