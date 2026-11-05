import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { RoomManagerModal } from '../../components/events/RoomManagerModal';
import { TemporalBadge } from '../../components/events/TemporalBadge';
import { ConfirmDeleteModal } from '../../components/ui/ConfirmDeleteModal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackStates';
import { useAuth } from '../../contexts/AuthContext';
import { useNowMs } from '../../hooks/useNowMs';
import { deleteEvent, getEventsByInstitutionId } from '../../services/eventService';
import type { EventViewModel } from '../../types/api';
import { refreshEventTemporalStatus } from '../../utils/dateUtils';

interface DashboardLocationState {
  feedbackMessage?: string;
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

  const institutionId = institution?.id ?? 0;

  const loadMyEvents = useCallback(async () => {
    if (!institutionId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getEventsByInstitutionId(institutionId);
      setEvents(data);
      syncNow();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os eventos da sua instituição.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, syncNow]);

  useEffect(() => {
    void loadMyEvents();
  }, [loadMyEvents]);

  const liveEvents = useMemo(
    () => events.map((ev) => refreshEventTemporalStatus(ev, nowMs)),
    [events, nowMs],
  );

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
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteEvent(eventToDelete.id);
      const removedName = eventToDelete.name;
      setEvents((prev) => prev.filter((item) => item.id !== eventToDelete.id));
      setEventToDelete(null);
      setFeedbackBanner(`O evento "${removedName}" foi excluído com sucesso.`);
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
            onClick={() => void loadMyEvents()}
            disabled={isLoading}
            className="text-xs font-semibold text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
          >
            Atualizar lista
          </button>
        </div>

        {isLoading ? (
          <LoadingState message="Carregando eventos da sua instituição..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={loadMyEvents} />
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
