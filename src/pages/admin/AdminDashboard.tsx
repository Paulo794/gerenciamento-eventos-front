import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RoomManagerModal } from '../../components/events/RoomManagerModal';
import { TemporalBadge } from '../../components/events/TemporalBadge';
import { ConfirmDeleteModal } from '../../components/ui/ConfirmDeleteModal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackStates';
import { useAuth } from '../../contexts/AuthContext';
import { useNowMs } from '../../hooks/useNowMs';
import {
  deleteEvent,
  getEventsByInstitutionId,
  getPublicEvents,
} from '../../services/eventService';
import type { EventViewModel, PeriodFilter } from '../../types/api';
import { matchesPeriodFilter, refreshEventTemporalStatus } from '../../utils/dateUtils';

interface DashboardLocationState {
  feedbackMessage?: string;
}

interface UnitSummaryRow {
  institutionId: number;
  institutionName: string;
  total: number;
  agendados: number;
  emAndamento: number;
  encerrados: number;
}

export function AdminDashboard() {
  const { institution, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as DashboardLocationState | null;
  const eventsHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [events, setEvents] = useState<EventViewModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(
    locationState?.feedbackMessage ?? null,
  );
  const { nowMs, syncNow } = useNowMs();

  const [eventToDelete, setEventToDelete] = useState<EventViewModel | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [eventForRooms, setEventForRooms] = useState<EventViewModel | null>(null);

  // Estado da Visão Geral entre Unidades (Modo Leitura — RF10b)
  const [regionalEvents, setRegionalEvents] = useState<EventViewModel[]>([]);
  const [isLoadingRegional, setIsLoadingRegional] = useState<boolean>(true);
  const [regionalError, setRegionalError] = useState<string | null>(null);
  const [regionalPeriod, setRegionalPeriod] = useState<PeriodFilter>('ALL');
  const [hasLoadedMyEvents, setHasLoadedMyEvents] = useState<boolean>(false);

  // Controle de concorrência para descartar respostas atrasadas (ex.: iniciadas antes de uma exclusão)
  const myEventsReqIdRef = useRef<number>(0);
  const regionalReqIdRef = useRef<number>(0);
  const deletedEventIdsRef = useRef<Set<number>>(new Set());

  const institutionId = institution?.id ?? 0;

  const loadMyEvents = useCallback(async () => {
    if (!institutionId) return;
    const reqId = ++myEventsReqIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getEventsByInstitutionId(institutionId);
      if (reqId !== myEventsReqIdRef.current) return;
      setEvents(data.filter((ev) => !deletedEventIdsRef.current.has(ev.id)));
      setHasLoadedMyEvents(true);
      syncNow();
    } catch (err) {
      if (reqId !== myEventsReqIdRef.current) return;
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os eventos da sua instituição.',
      );
    } finally {
      if (reqId === myEventsReqIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [institutionId, syncNow]);

  const loadRegionalOverview = useCallback(async () => {
    const reqId = ++regionalReqIdRef.current;
    setIsLoadingRegional(true);
    setRegionalError(null);
    try {
      const data = await getPublicEvents();
      if (reqId !== regionalReqIdRef.current) return;
      setRegionalEvents(data.filter((ev) => !deletedEventIdsRef.current.has(ev.id)));
      syncNow();
    } catch (err) {
      if (reqId !== regionalReqIdRef.current) return;
      setRegionalError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar a visão consolidada das unidades.',
      );
    } finally {
      if (reqId === regionalReqIdRef.current) {
        setIsLoadingRegional(false);
      }
    }
  }, [syncNow]);

  const refreshDashboardData = useCallback(() => {
    void loadMyEvents();
    void loadRegionalOverview();
  }, [loadMyEvents, loadRegionalOverview]);

  useEffect(() => {
    refreshDashboardData();
  }, [refreshDashboardData]);

  const liveEvents = useMemo(
    () => events.map((ev) => refreshEventTemporalStatus(ev, nowMs)),
    [events, nowMs],
  );

  // Garante fonte de dados consistente para a unidade logada entre os KPIs locais e a tabela consolidada
  const liveRegionalEvents = useMemo(() => {
    const baseEvents =
      hasLoadedMyEvents && !errorMessage && institutionId > 0
        ? [
            ...regionalEvents.filter((ev) => ev.institution_id !== institutionId),
            ...events.map((ev) => ({
              ...ev,
              institution_name: ev.institution_name || institution?.name || `Unidade #${institutionId}`,
            })),
          ]
        : regionalEvents;

    return baseEvents
      .map((ev) => refreshEventTemporalStatus(ev, nowMs))
      .filter((ev) => matchesPeriodFilter(ev, regionalPeriod, nowMs));
  }, [
    regionalEvents,
    events,
    hasLoadedMyEvents,
    errorMessage,
    institutionId,
    institution?.name,
    nowMs,
    regionalPeriod,
  ]);

  const unitSummaries = useMemo<UnitSummaryRow[]>(() => {
    const map = new Map<number, UnitSummaryRow>();
    for (const ev of liveRegionalEvents) {
      const id = ev.institution_id;
      const name = ev.institution_name || `Unidade #${id}`;
      let row = map.get(id);
      if (!row) {
        row = {
          institutionId: id,
          institutionName: name,
          total: 0,
          agendados: 0,
          emAndamento: 0,
          encerrados: 0,
        };
        map.set(id, row);
      }
      row.total += 1;
      if (ev.temporalStatus === 'AGENDADO') row.agendados += 1;
      else if (ev.temporalStatus === 'EM_ANDAMENTO') row.emAndamento += 1;
      else row.encerrados += 1;
    }

    return Array.from(map.values()).sort((a, b) =>
      a.institutionName.localeCompare(b.institutionName, 'pt-BR'),
    );
  }, [liveRegionalEvents]);

  const stats = useMemo(() => {
    let agendados = 0;
    let emAndamento = 0;
    let encerrados = 0;
    for (const ev of liveEvents) {
      if (ev.temporalStatus === 'AGENDADO') agendados += 1;
      else if (ev.temporalStatus === 'EM_ANDAMENTO') emAndamento += 1;
      else encerrados += 1;
    }
    return {
      total: liveEvents.length,
      agendados,
      emAndamento,
      encerrados,
    };
  }, [liveEvents]);

  async function handleConfirmDelete() {
    if (!eventToDelete) return;
    const removedId = eventToDelete.id;
    const removedName = eventToDelete.name;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteEvent(removedId);
      // Registra o ID excluído e invalida requisições em voo iniciadas antes da conclusão da exclusão
      deletedEventIdsRef.current.add(removedId);
      myEventsReqIdRef.current += 1;
      regionalReqIdRef.current += 1;

      setEvents((prev) => prev.filter((item) => item.id !== removedId));
      setRegionalEvents((prev) => prev.filter((item) => item.id !== removedId));
      setEventToDelete(null);
      setFeedbackBanner(`O evento "${removedName}" foi excluído com sucesso.`);
      refreshDashboardData();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Não foi possível excluir o evento selecionado.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabeçalho do Painel */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
              {isAdmin ? 'Perfil: Administrador Geral' : 'Perfil: Gestor de Unidade'}
            </span>
            {institution?.email && (
              <span className="text-xs text-slate-500">{institution.email}</span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Meus Eventos — {institution?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre novos eventos acadêmicos, atualize informações e gerencie as salas vinculadas à
            sua instituição.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin/instituicoes"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Gerenciar Instituições
            </Link>
          )}
          <Link
            to="/admin/eventos/novo"
            className="inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            + Novo Evento
          </Link>
        </div>
      </section>

      {feedbackBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          <span>{feedbackBanner}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="rounded-md px-2 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Resumo de Indicadores da Instituição */}
      <section
        aria-label="Resumo dos eventos da unidade"
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Total da Unidade</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold text-blue-700">Agendados</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{stats.agendados}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-700">Em andamento</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{stats.emAndamento}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Encerrados</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{stats.encerrados}</p>
        </div>
      </section>

      {/* Listagem de Eventos da Instituição */}
      <section aria-labelledby="my-events-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            ref={eventsHeadingRef}
            id="my-events-heading"
            tabIndex={-1}
            className="rounded text-lg font-bold tracking-tight text-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Eventos Cadastrados pela Unidade
          </h2>
          <button
            type="button"
            onClick={refreshDashboardData}
            disabled={isLoading || isLoadingRegional}
            className="text-xs font-semibold text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
          >
            Atualizar lista
          </button>
        </div>

        {isLoading ? (
          <LoadingState message="Carregando eventos da sua instituição..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={refreshDashboardData} />
        ) : liveEvents.length === 0 ? (
          <EmptyState
            title="Sua instituição ainda não cadastrou eventos"
            description="Comece publicando o primeiro evento acadêmico ou institucional da sua unidade para divulgá-lo na Agenda Pública."
            actionLabel="Cadastrar Primeiro Evento"
            onAction={() => navigate('/admin/eventos/novo')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {liveEvents.map((ev) => {
              // Alinhado ao ADR-004: somente eventos onde a instituição logada é proprietária habilitam edição/exclusão/salas
              const isOwner = Boolean(institution && ev.institution_id === institution.id);

              return (
                <article
                  key={ev.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <TemporalBadge status={ev.temporalStatus} />
                      <span className="text-xs font-medium text-slate-500">ID #{ev.id}</span>
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-slate-900">
                      <Link
                        to={`/eventos/${ev.id}`}
                        state={{ fromPath: '/admin' }}
                        className="hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                      >
                        {ev.name}
                      </Link>
                    </h3>

                    {ev.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{ev.description}</p>
                    )}

                    <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <div>
                        <dt className="inline font-semibold text-slate-800">Início: </dt>
                        <dd className="inline">{ev.formattedStartDate}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-slate-800">Término: </dt>
                        <dd className="inline">{ev.formattedEndDate}</dd>
                      </div>
                      <div>
                        <dt className="inline font-semibold text-slate-800">Local: </dt>
                        <dd className="inline">{ev.address}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <Link
                      to={`/eventos/${ev.id}`}
                      state={{ fromPath: '/admin' }}
                      className="text-xs font-semibold text-slate-700 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                    >
                      Ver página pública &rarr;
                    </Link>

                    {isOwner && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEventForRooms(ev)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                        >
                          Salas
                        </button>
                        <Link
                          to={`/admin/eventos/${ev.id}/editar`}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setEventToDelete(ev);
                          }}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Visão Geral Consolidada entre Unidades (Modo Leitura — RF10b) */}
      <section
        aria-labelledby="regional-overview-heading"
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
              Calendário Unificado — Modo Leitura
            </span>
            <h2
              id="regional-overview-heading"
              className="mt-1.5 text-lg font-bold tracking-tight text-slate-900"
            >
              Visão Consolidada de Eventos por Unidade
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Totais consolidados das unidades com eventos publicados na plataforma. O filtro de
              período contabiliza eventos que ocorram total ou parcialmente no intervalo selecionado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label
                htmlFor="regional-period-select"
                className="block text-[11px] font-semibold tracking-wide text-slate-700 uppercase"
              >
                Período de referência
              </label>
              <select
                id="regional-period-select"
                value={regionalPeriod}
                onChange={(e) => setRegionalPeriod(e.target.value as PeriodFilter)}
                className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/20"
              >
                <option value="ALL">Qualquer período</option>
                <option value="TODAY">Hoje</option>
                <option value="NEXT_7_DAYS">Próximos 7 dias</option>
                <option value="THIS_MONTH">Este mês</option>
              </select>
            </div>
            <button
              type="button"
              onClick={refreshDashboardData}
              disabled={isLoading || isLoadingRegional}
              className="mt-4 text-xs font-semibold text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
            >
              Atualizar visão
            </button>
          </div>
        </div>

        {isLoadingRegional ? (
          <LoadingState message="Carregando indicadores consolidados por unidade..." />
        ) : regionalError ? (
          <ErrorState message={regionalError} onRetry={refreshDashboardData} />
        ) : unitSummaries.length === 0 ? (
          <EmptyState
            title="Nenhum evento encontrado para o período selecionado"
            description="Não há eventos publicados pelas unidades que ocorram no período filtrado."
          />
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="regional-overview-heading"
            className="overflow-x-auto rounded-xl border border-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <caption className="sr-only">
                Resumo de eventos publicados por unidade e status temporal no período selecionado
              </caption>
              <thead className="bg-slate-50 font-bold tracking-wide text-slate-700 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Unidade / Instituição
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Total no Período
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-blue-800">
                    Agendados
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-emerald-800">
                    Em andamento
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-slate-600">
                    Encerrados
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Agenda da Unidade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {unitSummaries.map((row) => {
                  const isCurrentUnit = row.institutionId === institutionId;
                  return (
                    <tr
                      key={row.institutionId}
                      className={isCurrentUnit ? 'bg-red-50/40' : 'hover:bg-slate-50'}
                    >
                      <th scope="row" className="px-4 py-3 font-semibold text-slate-900">
                        <span>{row.institutionName}</span>
                        {isCurrentUnit && (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                            Sua unidade
                          </span>
                        )}
                      </th>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">
                        {row.total}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-700">
                        {row.agendados}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-emerald-700">
                        {row.emAndamento}
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-600">
                        {row.encerrados}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/instituicoes/${row.institutionId}`}
                          state={{ fromPath: '/admin' }}
                          className="font-semibold text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                        >
                          Ver eventos &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RoomManagerModal event={eventForRooms} onClose={() => setEventForRooms(null)} />

      <ConfirmDeleteModal
        isOpen={Boolean(eventToDelete)}
        eventName={eventToDelete?.name ?? ''}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        fallbackFocusRef={eventsHeadingRef}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => {
          if (!isDeleting) {
            setEventToDelete(null);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
}
