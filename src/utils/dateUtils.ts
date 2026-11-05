import type { ApiEvent, EventViewModel, PeriodFilter, TemporalEventStatus } from '../types/api';

export const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
const SAO_PAULO_OFFSET = '-03:00';

/**
 * Regra de compatibilidade temporária documentada no ADR-005 / SDD Seção 6:
 * O backend Go atual recebe strings SQL ("YYYY-MM-DD HH:mm:ss") sem fuso no INSERT/UPDATE,
 * grava no MariaDB 11.8 (container em UTC) e devolve com sufixo "Z" ("YYYY-MM-DDTHH:mm:ssZ")
 * por usar parseTime=true sem loc em config.go (sem ter somado +3h ao gravar).
 *
 * Esta função normaliza strings SQL sem offset ou strings rotuladas com "Z" vindas desse
 * contrato específico para o offset de America/Sao_Paulo ("-03:00"), preservando qualquer
 * string que já possua offset explícito (ex: "-03:00").
 */
export function normalizeApiDateString(rawDateStr: string): string {
  const trimmed = rawDateStr.trim();
  if (!trimmed) return '';

  // Caso 1: Formato SQL puro "YYYY-MM-DD HH:mm:ss" ou "YYYY-MM-DD HH:mm"
  const sqlMatch = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)$/.exec(trimmed);
  if (sqlMatch) {
    const timePart = sqlMatch[2].length === 5 ? `${sqlMatch[2]}:00` : sqlMatch[2];
    return `${sqlMatch[1]}T${timePart}${SAO_PAULO_OFFSET}`;
  }

  // Caso 2: Formato ISO retornado pelo Go atual com "Z" nominal ("YYYY-MM-DDTHH:mm:ssZ")
  const goNominalUtcMatch = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)Z$/i.exec(trimmed);
  if (goNominalUtcMatch) {
    return `${goNominalUtcMatch[1]}${SAO_PAULO_OFFSET}`;
  }

  // Caso 3: String ISO sem offset ("YYYY-MM-DDTHH:mm" ou "YYYY-MM-DDTHH:mm:ss")
  const naiveIsoMatch = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?)$/.exec(trimmed);
  if (naiveIsoMatch) {
    const base = naiveIsoMatch[1].length === 16 ? `${naiveIsoMatch[1]}:00` : naiveIsoMatch[1];
    return `${base}${SAO_PAULO_OFFSET}`;
  }

  // Caso 4: Já possui offset explícito (ex: "2026-10-10T09:00:00-03:00")
  return trimmed;
}

/**
 * Converte uma string de data da API em um objeto Date válido (instante real).
 */
export function parseApiDate(rawDateStr: string): Date {
  const normalized = normalizeApiDateString(rawDateStr);
  return new Date(normalized);
}

/**
 * Formata um instante para exibição em português no fuso America/Sao_Paulo
 * Ex: "10/10/2026 às 09:00"
 */
export function formatEventDateTime(rawDateStr: string): string {
  const date = parseApiDate(rawDateStr);
  if (Number.isNaN(date.getTime())) {
    return rawDateStr;
  }

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  return `${map.day}/${map.month}/${map.year} às ${map.hour}:${map.minute}`;
}

/**
 * Converte uma string de data da API para o formato aceito por <input type="datetime-local">
 * no fuso America/Sao_Paulo: "YYYY-MM-DDTHH:mm"
 */
export function toDatetimeLocalInput(rawDateStr: string): string {
  const date = parseApiDate(rawDateStr);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // O locale 'sv-SE' formata como "YYYY-MM-DD HH:mm"
  return formatter.format(date).replace(' ', 'T');
}

/**
 * Converte o valor de <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * para o formato SQL esperado pelo MariaDB na API Go ("YYYY-MM-DD HH:mm:00").
 */
export function toSqlTimestamp(datetimeLocalValue: string): string {
  const trimmed = datetimeLocalValue.trim();
  if (!trimmed) return '';

  const match = /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  const seconds = match[3] ?? '00';
  return `${match[1]} ${match[2]}:${seconds}`;
}

/**
 * Calcula o estado temporal do evento comparando início e término com o instante de referência.
 */
export function getTemporalEventStatus(
  startMs: number,
  endMs: number,
  nowMs: number = Date.now(),
): TemporalEventStatus {
  if (nowMs < startMs) {
    return 'AGENDADO';
  }
  if (nowMs <= endMs) {
    return 'EM_ANDAMENTO';
  }
  return 'ENCERRADO';
}

/**
 * Constrói o ViewModel de um evento retornado pela API.
 */
export function toEventViewModel(apiEvent: ApiEvent, nowMs: number = Date.now()): EventViewModel {
  const startDate = parseApiDate(apiEvent.start_date);
  const endDate = parseApiDate(apiEvent.end_date);
  const startInstantMs = startDate.getTime();
  const endInstantMs = endDate.getTime();

  return {
    ...apiEvent,
    rooms: apiEvent.rooms ?? [],
    temporalStatus: getTemporalEventStatus(startInstantMs, endInstantMs, nowMs),
    startInstantMs,
    endInstantMs,
    formattedStartDate: formatEventDateTime(apiEvent.start_date),
    formattedEndDate: formatEventDateTime(apiEvent.end_date),
  };
}

/**
 * Atualiza o estado temporal de um EventViewModel já construído para o instante atual.
 */
export function refreshEventTemporalStatus(
  event: EventViewModel,
  nowMs: number = Date.now(),
): EventViewModel {
  const nextStatus = getTemporalEventStatus(event.startInstantMs, event.endInstantMs, nowMs);
  if (nextStatus === event.temporalStatus) {
    return event;
  }
  return {
    ...event,
    temporalStatus: nextStatus,
  };
}

/**
 * Obtém { year, month, day } de um timestamp no fuso America/Sao_Paulo.
 */
function getSaoPauloDateParts(ms: number): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, d] = formatter.format(new Date(ms)).split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Verifica se um evento se enquadra no filtro de período selecionado no fuso America/Sao_Paulo.
 */
export function matchesPeriodFilter(
  event: EventViewModel,
  period: PeriodFilter,
  nowMs: number = Date.now(),
): boolean {
  if (period === 'ALL') return true;

  const nowParts = getSaoPauloDateParts(nowMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayStartMs = new Date(
    `${nowParts.year}-${pad(nowParts.month)}-${pad(nowParts.day)}T00:00:00${SAO_PAULO_OFFSET}`,
  ).getTime();
  const todayEndMs = new Date(
    `${nowParts.year}-${pad(nowParts.month)}-${pad(nowParts.day)}T23:59:59.999${SAO_PAULO_OFFSET}`,
  ).getTime();

  if (period === 'TODAY') {
    // Evento ocorre ou está ativo em algum momento de hoje
    return event.startInstantMs <= todayEndMs && event.endInstantMs >= todayStartMs;
  }

  if (period === 'NEXT_7_DAYS') {
    // Janela de 7 dias do calendário a partir de hoje (hoje + próximos 6 dias completos)
    const sevenDaysEndMs = todayEndMs + 6 * 24 * 60 * 60 * 1000;
    return event.startInstantMs <= sevenDaysEndMs && event.endInstantMs >= todayStartMs;
  }

  if (period === 'THIS_MONTH') {
    const lastDayOfMonth = new Date(nowParts.year, nowParts.month, 0).getDate();
    const monthStartMs = new Date(
      `${nowParts.year}-${pad(nowParts.month)}-01T00:00:00${SAO_PAULO_OFFSET}`,
    ).getTime();
    const monthEndMs = new Date(
      `${nowParts.year}-${pad(nowParts.month)}-${pad(lastDayOfMonth)}T23:59:59.999${SAO_PAULO_OFFSET}`,
    ).getTime();
    return event.startInstantMs <= monthEndMs && event.endInstantMs >= monthStartMs;
  }

  return true;
}
