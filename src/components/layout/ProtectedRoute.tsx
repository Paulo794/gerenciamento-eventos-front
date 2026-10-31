import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm"
        >
          <h1 className="text-lg font-bold">Acesso restrito ao Administrador Geral</h1>
          <p className="mt-2 text-sm text-red-800">
            Sua conta institucional não possui privilégios de administração geral para acessar esta
            página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
