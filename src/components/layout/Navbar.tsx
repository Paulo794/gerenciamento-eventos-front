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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700 font-bold text-white shadow-sm">
              FP
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-900">
                Eventos Fatec
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Unidade Piloto: Fatec Shunji Nishimura — Pompeia
              </span>
            </div>
          </Link>
        </div>

        <nav aria-label="Navegação principal" className="flex flex-wrap items-center gap-2 sm:gap-3">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                isActive
                  ? 'bg-red-50 text-red-800'
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
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                    isActive
                      ? 'bg-red-50 text-red-800'
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
                    `rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                      isActive
                        ? 'bg-red-50 text-red-800'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  Instituições
                </NavLink>
              )}

              <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
                <div className="hidden text-right sm:block">
                  <span className="block text-xs font-semibold text-slate-900">
                    {institution?.name}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {isAdmin ? 'Administrador Geral' : 'Gestor de Unidade'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                >
                  Sair
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Acesso Institucional
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
