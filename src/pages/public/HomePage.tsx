import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EventCard } from '../../components/events/EventCard';
import { EventFilters, type InstitutionOption } from '../../components/events/EventFilters';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackStates';
import { useNowMs } from '../../hooks/useNowMs';
import { getPublicEvents } from '../../services/eventService';
import type { EventViewModel, PeriodFilter, TemporalEventStatus } from '../../types/api';
import { matchesPeriodFilter, refreshEventTemporalStatus } from '../../utils/dateUtils';

const VALID_PERIODS: PeriodFilter[] = ['ALL', 'TODAY', 'NEXT_7_DAYS', 'THIS_MONTH'];
const VALID_STATUSES: Array<TemporalEventStatus | 'ALL'> = [
  'ALL',
  'AGENDADO',
  'EM_ANDAMENTO',
  'ENCERRADO',
];

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<EventViewModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { nowMs, syncNow } = useNowMs();

  const searchQuery = searchParams.get('q') ?? '';
  const institutionId = searchParams.get('institution') ?? '';
  const rawPeriod = (searchParams.get('period') ?? 'ALL') as PeriodFilter;
  const period: PeriodFilter = VALID_PERIODS.includes(rawPeriod) ? rawPeriod : 'ALL';

  const rawStatus = (searchParams.get('status') ?? 'ALL') as TemporalEventStatus | 'ALL';
  const statusFilter: TemporalEventStatus | 'ALL' = VALID_STATUSES.includes(rawStatus)
    ? rawStatus
    : 'ALL';

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPublicEvents();
      setEvents(data);
      syncNow();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Ocorreu um erro ao buscar a agenda de eventos.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [syncNow]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const liveEvents = useMemo(
    () => events.map((ev) => refreshEventTemporalStatus(ev, nowMs)),
    [events, nowMs],
  );

  const institutions = useMemo<InstitutionOption[]>(() => {
    const map = new Map<number, string>();
    for (const ev of liveEvents) {
      if (ev.institution_id && ev.institution_name) {
        map.set(ev.institution_id, ev.institution_name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [liveEvents]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return liveEvents.filter((ev) => {
      if (normalizedQuery) {
        const matchesName = ev.name.toLowerCase().includes(normalizedQuery);
        const matchesAddress = ev.address.toLowerCase().includes(normalizedQuery);
        const matchesInstitution = ev.institution_name.toLowerCase().includes(normalizedQuery);
        if (!matchesName && !matchesAddress && !matchesInstitution) {
          return false;
        }
      }

      if (institutionId && String(ev.institution_id) !== institutionId) {
        return false;
      }

      if (statusFilter !== 'ALL' && ev.temporalStatus !== statusFilter) {
        return false;
      }

      if (!matchesPeriodFilter(ev, period, nowMs)) {
        return false;
      }

      return true;
    });
  }, [liveEvents, searchQuery, institutionId, statusFilter, period, nowMs]);

  function updateParam(key: string, value: string, defaultValue = '') {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  function handleClearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  const hasActiveFilters = Boolean(
    searchQuery.trim() || institutionId || period !== 'ALL' || statusFilter !== 'ALL',
  );

  return (
    <div>
      {/* Banner Institucional */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            Centro Paula Souza — Polo Regional 08
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Calendário de Eventos Unificado das Fatecs
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
            Consulte palestras, semanas acadêmicas, workshops e atividades institucionais da{' '}
            <strong className="font-semibold text-slate-800">
              Fatec Shunji Nishimura (Pompeia)
            </strong>{' '}
            e das demais Fatecs da região (Adamantina, Assis, Garça, Marília, Ourinhos, Presidente
            Prudente, Paraguaçu Paulista e Teodoro Sampaio).
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <EventFilters
          searchQuery={searchQuery}
          institutionId={institutionId}
          period={period}
          statusFilter={statusFilter}
          institutions={institutions}
          totalResults={filteredEvents.length}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={(val) => updateParam('q', val)}
          onInstitutionChange={(val) => updateParam('institution', val)}
          onPeriodChange={(val) => updateParam('period', val, 'ALL')}
          onStatusChange={(val) => updateParam('status', val, 'ALL')}
          onClearFilters={handleClearFilters}
        />

        {isLoading ? (
          <LoadingState message="Carregando agenda pública de eventos..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={loadEvents} />
        ) : events.length === 0 ? (
          <EmptyState
            title="Nenhum evento cadastrado no momento"
            description="Ainda não há eventos publicados na plataforma. Assim que as instituições cadastrarem novas atividades, elas aparecerão aqui."
          />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="Nenhum evento encontrado para os filtros selecionados"
            description="Tente buscar por outro termo ou limpar os filtros aplicados para visualizar todos os eventos disponíveis."
            actionLabel="Limpar todos os filtros"
            onAction={handleClearFilters}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
