import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { AuthProvider } from './contexts/AuthContext';

function FoundationWelcome() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
          Etapa 1 Concluída — Fundação do Frontend
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Portal de Eventos — Fatec Shunji Nishimura (Pompeia)
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Estrutura base com React, TypeScript, Vite, Tailwind CSS, React Router, utilitários de
          fuso horário (America/Sao_Paulo) e cliente HTTP integrados à API Go.
        </p>
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
              <Route path="*" element={<FoundationWelcome />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
