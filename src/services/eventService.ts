import type {
  AddRoomRequest,
  ApiEvent,
  ApiMessageResponse,
  ApiRoomEvent,
  CreateEventRequest,
  DeleteRoomRequest,
  EditEventRequest,
  EditRoomRequest,
  EventViewModel,
} from '../types/api';
import { toEventViewModel } from '../utils/dateUtils';
import { apiFetch } from './api';

function normalizeEventList(data: ApiEvent[] | null | undefined): EventViewModel[] {
  const list = Array.isArray(data) ? data : [];
  const nowMs = Date.now();
  return list.map((item) => toEventViewModel(item, nowMs));
}

export async function getPublicEvents(): Promise<EventViewModel[]> {
  const data = await apiFetch<ApiEvent[] | null>('/events');
  return normalizeEventList(data);
}

export async function searchEventsByName(query: string): Promise<EventViewModel[]> {
  const encoded = encodeURIComponent(query.trim());
  const data = await apiFetch<ApiEvent[] | null>(`/event/search/${encoded}`);
  return normalizeEventList(data);
}

export async function getEventById(eventId: number): Promise<EventViewModel> {
  const data = await apiFetch<ApiEvent>(`/event/${eventId}`);
  return toEventViewModel(data);
}

export async function getEventsByInstitutionId(institutionId: number): Promise<EventViewModel[]> {
  const data = await apiFetch<ApiEvent[] | null>(`/event/institution/${institutionId}`);
  return normalizeEventList(data);
}

export async function createEvent(
  payload: CreateEventRequest,
  fallbackInstitutionName = '',
): Promise<EventViewModel> {
  const created = await apiFetch<ApiEvent>('/event', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  // Nota técnica: POST /event no Go não faz JOIN para preencher institution_name
  const withInstitutionName: ApiEvent = {
    ...created,
    institution_name: created.institution_name || fallbackInstitutionName,
  };
  return toEventViewModel(withInstitutionName);
}

export async function updateEvent(
  eventId: number,
  payload: EditEventRequest,
): Promise<EventViewModel> {
  const updated = await apiFetch<ApiEvent>(`/event/${eventId}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });
  return toEventViewModel(updated);
}

export async function deleteEvent(eventId: number): Promise<ApiMessageResponse> {
  return apiFetch<ApiMessageResponse>(`/event/${eventId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

export async function getRoomsByEventId(eventId: number): Promise<ApiRoomEvent[]> {
  const data = await apiFetch<ApiRoomEvent[] | null>(`/event/${eventId}/room`, {
    method: 'GET',
    requiresAuth: true,
  });
  return Array.isArray(data) ? data : [];
}

export async function addRoomToEvent(
  eventId: number,
  payload: AddRoomRequest,
): Promise<ApiRoomEvent[]> {
  const data = await apiFetch<ApiRoomEvent[] | null>(`/event/${eventId}/room`, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });
  return Array.isArray(data) ? data : [];
}

export async function editRoomInEvent(
  eventId: number,
  payload: EditRoomRequest,
): Promise<ApiRoomEvent> {
  return apiFetch<ApiRoomEvent>(`/event/${eventId}/room`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });
}

export async function deleteRoomFromEvent(
  eventId: number,
  payload: DeleteRoomRequest,
): Promise<ApiMessageResponse> {
  return apiFetch<ApiMessageResponse>(`/event/${eventId}/room`, {
    method: 'DELETE',
    body: payload,
    requiresAuth: true,
  });
}
