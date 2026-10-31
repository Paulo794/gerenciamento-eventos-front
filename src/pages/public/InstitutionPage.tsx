import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EventCard } from '../../components/events/EventCard';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/FeedbackStates';
import { getEventsByInstitutionId } from '../../services/eventService';
import { getInstitutionById } from '../../services/institutionService';
import type { ApiInstitution, EventViewModel } from '../../types/api';

export function InstitutionPage() {
  const { id } = useParams<{ id: string }>();
  const institutionId = Number(id);

  const [institution, setInstitution] = useState<ApiInstitution | null>(null);
  const [events, setEvents] = useState<EventViewModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInstitutionData = useCallback(async () => {
    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      setErrorMessage('Identificador de instituição inválido.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Conforme documentado no SDD: GET /institution/{id} não preenche o array events,
      // portanto consultamos ambos os endpoints em paralelo.
      const [instData, instEvents] = await Promise.all([
        getInstitutionById(institutionId),
        getEventsByInstitutionId(institutionId),
      ]);
      setInstitution(instData);
      setEvents(instEvents);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os dados desta instituição.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadInstitutionData();
  }, [loadInstitutionData]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <span aria-hidden="true">&larr;</span>
          Voltar para a agenda geral
        </Link>
      </div>

      {isLoading ? (
        <LoadingState message="Carregando informações da unidade e seus eventos..." />
      ) : errorMessage || !institution ? (
        <ErrorState
          title="Instituição não encontrada"
          message={errorMessage ?? 'A unidade solicitada não foi localizada.'}
          onRetry={loadInstitutionData}
        />
      ) : (
        <div className="space-y-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
              Unidade Organizadora
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {institution.name}
            </h1>
            <dl className="mt-4 flex flex-wrap gap-6 text-xs text-slate-600">
              {institution.email && (
                <div>
                  <dt className="font-semibold text-slate-800">E-mail de contato</dt>
                  <dd className="mt-0.5">{institution.email}</dd>
                </div>
              )}
              {institution.cnpj && (
                <div>
                  <dt className="font-semibold text-slate-800">CNPJ</dt>
                  <dd className="mt-0.5">{institution.cnpj}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-slate-800">Eventos publicados</dt>
                <dd className="mt-0.5">{events.length}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="institution-events-heading" className="space-y-4">
            <h2
              id="institution-events-heading"
              className="text-lg font-bold tracking-tight text-slate-900"
            >
              Eventos de {institution.name}
            </h2>

            {events.length === 0 ? (
              <EmptyState
                title="Esta instituição ainda não possui eventos publicados"
                description="Não há eventos cadastrados para esta unidade no momento."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
