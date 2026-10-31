const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

export const STORAGE_TOKEN_KEY = '@EventosFatec:token';
export const STORAGE_INSTITUTION_KEY = '@EventosFatec:institution';

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type SessionExpiredListener = () => void;
let onSessionExpiredCallback: SessionExpiredListener | null = null;

export function setOnSessionExpired(listener: SessionExpiredListener | null): void {
  onSessionExpiredCallback = listener;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_TOKEN_KEY);
  } catch {
    return null;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  requiresAuth?: boolean;
  isLoginEndpoint?: boolean;
}

/**
 * Cliente HTTP Fetch centralizado com:
 * - Parse resiliente (JSON ou texto puro, como o 401 retornado pelo middleware jwtauth do Go)
 * - Distinção entre 401 de login inválido vs. 401 de sessão expirada
 * - Tratamento de 403 (sem derrubar sessão) e 404
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, requiresAuth = false, isLoginEndpoint = false, headers: customHeaders, ...rest } = options;

  const headers = new Headers(customHeaders);
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (requiresAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor da API. Verifique se o backend em Go está em execução.',
      0,
    );
  }

  const rawText = await response.text();
  let parsedData: unknown = null;

  if (rawText) {
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = rawText.trim();
    }
  }

  if (!response.ok) {
    let errorMessage = '';
    if (
      parsedData &&
      typeof parsedData === 'object' &&
      'message' in parsedData &&
      typeof (parsedData as { message: unknown }).message === 'string'
    ) {
      errorMessage = (parsedData as { message: string }).message;
    } else if (typeof parsedData === 'string' && parsedData.length > 0) {
      errorMessage = parsedData;
    }

    if (response.status === 401) {
      if (isLoginEndpoint) {
        throw new ApiError(errorMessage || 'E-mail ou senha inválidos.', 401);
      }
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback();
      }
      throw new ApiError('Sua sessão expirou ou é inválida. Faça login novamente.', 401);
    }

    if (response.status === 403) {
      throw new ApiError(
        errorMessage || 'Acesso negado: sua instituição não possui permissão para realizar esta operação.',
        403,
      );
    }

    if (response.status === 404) {
      throw new ApiError(errorMessage || 'O recurso solicitado não foi encontrado.', 404);
    }

    throw new ApiError(
      errorMessage || `Erro na requisição (código HTTP ${response.status}).`,
      response.status,
    );
  }

  return parsedData as T;
}
