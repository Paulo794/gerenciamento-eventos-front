import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { EventFormPage } from './pages/admin/EventFormPage';
import { InstitutionsAdminPage } from './pages/admin/InstitutionsAdminPage';
import { LoginPage } from './pages/admin/LoginPage';
import { EventDetailsPage } from './pages/public/EventDetailsPage';
import { HomePage } from './pages/public/HomePage';
import { InstitutionPage } from './pages/public/InstitutionPage';

function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-xs">
        <p className="text-xs font-bold tracking-wide text-red-700 uppercase">Erro 404</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Voltar para a Agenda Pública
        </Link>
      </div>
    </section>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/" element={<HomePage />} />
              <Route path="/eventos/:id" element={<EventDetailsPage />} />
              <Route path="/instituicoes/:id" element={<InstitutionPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Rotas Institucionais Autenticadas */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/eventos/novo"
                element={
                  <ProtectedRoute>
                    <EventFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/eventos/:id/editar"
                element={
                  <ProtectedRoute>
                    <EventFormPage />
                  </ProtectedRoute>
                }
              />

              {/* Rota Exclusiva de Administrador Geral */}
              <Route
                path="/admin/instituicoes"
                element={
                  <ProtectedRoute requireAdmin>
                    <InstitutionsAdminPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
