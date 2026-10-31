import type { ApiInstitution, CreateInstitutionRequest } from '../types/api';
import { apiFetch } from './api';

export async function getInstitutionById(institutionId: number): Promise<ApiInstitution> {
  return apiFetch<ApiInstitution>(`/institution/${institutionId}`);
}

export async function createInstitution(
  payload: CreateInstitutionRequest,
): Promise<ApiInstitution> {
  return apiFetch<ApiInstitution>('/institution', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });
}
