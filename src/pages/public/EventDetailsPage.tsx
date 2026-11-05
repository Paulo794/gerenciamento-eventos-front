import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { TemporalBadge } from '../../components/events/TemporalBadge';
import { ErrorState, LoadingState } from '../../components/ui/FeedbackStates';
import { useNowMs } from '../../hooks/useNowMs';
import { getEventById } from '../../services/eventService';
import type { EventViewModel } from '../../types/api';
import { refreshEventTemporalStatus } from '../../utils/dateUtils';

interface LocationState {
  fromPath?: string;
  fromSearch?: string;
  parentFromPath?: string;
}

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const backUrl = state?.fromPath
    ? state.fromPath
    : state?.fromSearch
      ? `/${state.fromSearch}`
      : '/';

  const backLabel = backUrl.startsWith('/instituicoes/')
    ? 'Voltar para a página da instituição'
    : backUrl.startsWith('/admin')
      ? 'Voltar para Meus Eventos'
      : 'Voltar para a listagem de eventos';

  const [event, setEvent] = useState<EventViewModel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { nowMs, syncNow } = useNowMs();

  const eventId = Number(id);

  const loadDetails = useCallback(async () => {
    if (!Number.isInteger(eventId) || eventId <= 0) {
      setErrorMessage('Identificador de evento inválido.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getEventById(eventId);
      setEvent(data);
      syncNow();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível carregar os detalhes deste evento.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [eventId, syncNow]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const liveEvent = useMemo(
    () => (event ? refreshEventTemporalStatus(event, nowMs) : null),
    [event, nowMs],
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          to={backUrl}
          state={state?.parentFromPath ? { fromPath: state.parentFromPath } : undefined}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <span aria-hidden="true">&larr;</span>
          {backLabel}
        </Link>
      </div>

      {isLoading ? (
        <LoadingState message="Carregando detalhes do evento e salas..." />
      ) : errorMessage || !liveEvent ? (
        <ErrorState
          title="Evento não encontrado ou indisponível"
          message={errorMessage ?? 'O evento solicitado não foi localizado.'}
          onRetry={loadDetails}
        />
      ) : (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TemporalBadge status={liveEvent.temporalStatus} />
              {liveEvent.institution_name && (
                <Link
                  to={`/instituicoes/${liveEvent.institution_id}`}
                  state={{
                    fromPath: `${location.pathname}${location.search}`,
                    parentFromPath: backUrl,
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 transition-colors hover:border-red-700 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                >
                  Unidade responsável: {liveEvent.institution_name}
                </Link>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {liveEvent.name}
            </h1>
          </div>

          <div className="space-y-8 px-6 py-6 sm:px-8">
            {/* Datas e Endereço */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <h2 className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Data e Horário (Horário de Brasília)
                </h2>
                <dl className="mt-2 space-y-1 text-sm text-slate-800">
                  <div>
                    <dt className="inline font-semibold">Início: </dt>
                    <dd className="inline">{liveEvent.formattedStartDate}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Término: </dt>
                    <dd className="inline">{liveEvent.formattedEndDate}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <h2 className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                  Localização / Endereço
                </h2>
                <p className="mt-2 text-sm font-medium text-slate-800">{liveEvent.address}</p>
              </div>
            </div>

            {/* Descrição */}
            <section aria-labelledby="event-description-heading">
              <h2
                id="event-description-heading"
                className="text-base font-bold tracking-tight text-slate-900"
              >
                Sobre o Evento
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {liveEvent.description || 'Nenhuma descrição informada para este evento.'}
              </p>
            </section>

            {/* Salas / Espaços do Evento */}
            <section
              aria-labelledby="event-rooms-heading"
              className="border-t border-slate-200 pt-6"
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="event-rooms-heading"
                  className="text-base font-bold tracking-tight text-slate-900"
                >
                  Salas e Espaços do Evento
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  {liveEvent.rooms.length} {liveEvent.rooms.length === 1 ? 'sala' : 'salas'}
                </span>
              </div>

              {liveEvent.rooms.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  Nenhuma sala ou auditório específico foi cadastrado para este evento até o
                  momento.
                </p>
              ) : (
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {liveEvent.rooms.map((room) => (
                    <li
                      key={room.room_id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium text-slate-800 shadow-2xs"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-700"
                      >
                        #
                      </span>
                      <span>{room.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </article>
      )}
    </div>
  );
}
