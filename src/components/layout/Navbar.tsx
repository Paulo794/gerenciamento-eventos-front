import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Navbar() {
  const { isAuthenticated, isAdmin, institution, signOut } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    signOut();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="group flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            title="Página Inicial — Calendário de Eventos Unificado"
          >
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-slate-900 group-hover:text-red-700 transition-colors">
                  fatec
                </span>
                <span className="text-sm font-semibold tracking-tight text-slate-700 border-l border-slate-300 pl-2">
                  Pompeia
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <span>Shunji Nishimura</span>
                <span className="text-slate-300">•</span>
                <span className="text-red-700 font-semibold">Polo Regional 08</span>
              </div>
            </div>
          </Link>
        </div>

        <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-2 sm:gap-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                isActive
                  ? 'bg-red-50 text-red-800 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            Agenda Pública
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                    isActive
                      ? 'bg-red-50 text-red-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                Meus Eventos
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/admin/instituicoes"
                  className={({ isActive }) =>
                    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                      isActive
                        ? 'bg-red-50 text-red-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  Instituições
                </NavLink>
              )}

              <div className="ml-1 flex items-center gap-2.5 border-l border-slate-200 pl-3">
                <div className="hidden text-right sm:block">
                  <span className="block text-xs font-semibold text-slate-900 leading-tight">
                    {institution?.name}
                  </span>
                  <span className="inline-block mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {isAdmin ? 'Administrador Geral' : 'Gestor de Unidade'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                >
                  Sair
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Acesso Institucional
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
