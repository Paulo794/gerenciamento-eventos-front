import type { ApiLoginResponse, LoginRequest } from '../types/api';
import { apiFetch } from './api';

export async function loginInstitution(credentials: LoginRequest): Promise<ApiLoginResponse> {
  return apiFetch<ApiLoginResponse>('/login', {
    method: 'POST',
    body: credentials,
    isLoginEndpoint: true,
  });
}
