import spGovLogo from '../../assets/images/logo-rodape-governo-do-estado-sp.png';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-800 bg-black text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div className="space-y-1.5 text-center sm:text-left text-xs">
          <p className="text-sm font-bold text-white tracking-wide">
            Faculdade de Tecnologia &ldquo;Shunji Nishimura&rdquo; — Fatec Pompeia
          </p>
          <p className="text-neutral-300">
            Unidade Piloto do Polo Regional 08 · Avenida Fundação Shunji Nishimura, 605 — Pompeia/SP
          </p>
          <p className="text-[11px] text-neutral-400">
            Projeto Integrador — CST em Sistemas Inteligentes · Centro Paula Souza (CEETEPS)
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-center">
          <img
            src={spGovLogo}
            alt="Governo do Estado de São Paulo"
            className="h-9 sm:h-10 w-auto object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </footer>
  );
}

