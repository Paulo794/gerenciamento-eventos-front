// ============================================================================
// 1. TIPOS DE RESPOSTA DA API GO (Espelho de internal/entity e internal/webserver)
// ============================================================================

export interface ApiRoomEvent {
  room_id: number;
  name: string;
}

export interface ApiEvent {
  id: number;
  name: string;
  address: string;
  start_date: string;
  end_date: string;
  description: string;
  institution_id: number;
  institution_name: string;
  rooms?: ApiRoomEvent[] | null;
}

export interface ApiInstitution {
  id: number;
  name: string;
  email?: string;
  user_type?: string;
  cnpj?: string;
  is_admin: boolean;
  events?: ApiEvent[] | null;
}

export interface ApiLoginResponse {
  token: string;
  institution: ApiInstitution;
}

export interface ApiMessageResponse {
  message: string;
}

// ============================================================================
// 2. PAYLOADS DE REQUISIÇÃO (Envio para a API Go)
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateInstitutionRequest {
  name: string;
  email: string;
  password: string;
  cnpj: string;
  is_admin?: boolean;
}

export interface CreateEventRequest {
  name: string;
  address: string;
  start_date: string;
  end_date: string;
  description: string;
}

export type EditEventRequest = CreateEventRequest;

export interface AddRoomRequest {
  name: string;
}

export interface EditRoomRequest {
  room_id: number;
  name: string;
}

export interface DeleteRoomRequest {
  room_id: number;
}

// ============================================================================
// 3. DADOS DERIVADOS PARA A INTERFACE (UI)
// ============================================================================

export type TemporalEventStatus = 'AGENDADO' | 'EM_ANDAMENTO' | 'ENCERRADO';

export type PeriodFilter = 'ALL' | 'TODAY' | 'NEXT_7_DAYS' | 'THIS_MONTH';

export interface EventViewModel extends Omit<ApiEvent, 'rooms'> {
  rooms: ApiRoomEvent[];
  temporalStatus: TemporalEventStatus;
  startInstantMs: number;
  endInstantMs: number;
  formattedStartDate: string;
  formattedEndDate: string;
}
