import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ApiInstitution, LoginRequest } from '../types/api';
import {
  STORAGE_INSTITUTION_KEY,
  STORAGE_TOKEN_KEY,
  setAuthToken,
  setOnSessionExpired,
} from '../services/api';
import { loginInstitution } from '../services/authService';

interface AuthContextValue {
  token: string | null;
  institution: ApiInstitution | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  sessionNotice: string | null;
  clearSessionNotice: () => void;
  signIn: (credentials: LoginRequest) => Promise<ApiInstitution>;
  signOut: (notice?: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isTokenExpired(jwt: string): boolean {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (typeof payload.exp === 'number') {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return false;
  }
}

function readStoredSession(): { token: string | null; institution: ApiInstitution | null } {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const rawInstitution = localStorage.getItem(STORAGE_INSTITUTION_KEY);
    if (!token || !rawInstitution) {
      return { token: null, institution: null };
    }
    if (isTokenExpired(token)) {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_INSTITUTION_KEY);
      return { token: null, institution: null };
    }
    const institution = JSON.parse(rawInstitution) as ApiInstitution;
    return { token, institution };
  } catch {
    return { token: null, institution: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => {
    const stored = readStoredSession();
    setAuthToken(stored.token);
    return stored;
  }, []);
  const [token, setToken] = useState<string | null>(initial.token);
  const [institution, setInstitution] = useState<ApiInstitution | null>(initial.institution);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const signOut = useCallback((notice?: string) => {
    setAuthToken(null);
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_INSTITUTION_KEY);
    } catch {
      // Ignora falhas de acesso ao storage
    }
    setToken(null);
    setInstitution(null);
    if (notice) {
      setSessionNotice(notice);
    }
  }, []);

  useEffect(() => {
    setOnSessionExpired(() => {
      signOut('Sua sessão expirou. Por favor, entre novamente.');
    });
    return () => {
      setOnSessionExpired(null);
    };
  }, [signOut]);

  const signIn = useCallback(async (credentials: LoginRequest): Promise<ApiInstitution> => {
    const response = await loginInstitution(credentials);
    setAuthToken(response.token);
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, response.token);
      localStorage.setItem(STORAGE_INSTITUTION_KEY, JSON.stringify(response.institution));
    } catch {
      // Continua em memória mesmo se o storage estiver bloqueado
    }
    setToken(response.token);
    setInstitution(response.institution);
    setSessionNotice(null);
    return response.institution;
  }, []);

  const clearSessionNotice = useCallback(() => {
    setSessionNotice(null);
  }, []);

  const isAuthenticated = Boolean(token && institution);
  const isAdmin = Boolean(
    institution && (institution.is_admin || institution.user_type === 'admin'),
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      institution,
      isAuthenticated,
      isAdmin,
      sessionNotice,
      clearSessionNotice,
      signIn,
      signOut,
    }),
    [token, institution, isAuthenticated, isAdmin, sessionNotice, clearSessionNotice, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
