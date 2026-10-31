import { Link, useLocation } from 'react-router-dom';
import type { EventViewModel } from '../../types/api';
import { TemporalBadge } from './TemporalBadge';

interface EventCardProps {
  event: EventViewModel;
}

export function EventCard({ event }: EventCardProps) {
  const location = useLocation();

  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TemporalBadge status={event.temporalStatus} />
          {event.institution_name && (
            <Link
              to={`/instituicoes/${event.institution_id}`}
              className="text-xs font-semibold text-red-700 hover:text-red-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              {event.institution_name}
            </Link>
          )}
        </div>

        <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-900">
          <Link
            to={`/eventos/${event.id}`}
            state={{ fromSearch: location.search }}
            className="hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            {event.name}
          </Link>
        </h2>

        {event.description && (
          <p className="mt-2 line-clamp-3 text-sm text-slate-600">{event.description}</p>
        )}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <dl className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <dt className="font-semibold text-slate-800">Início:</dt>
            <dd>{event.formattedStartDate}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="font-semibold text-slate-800">Término:</dt>
            <dd>{event.formattedEndDate}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="shrink-0 font-semibold text-slate-800">Local:</dt>
            <dd className="line-clamp-1" title={event.address}>
              {event.address}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-end">
          <Link
            to={`/eventos/${event.id}`}
            state={{ fromSearch: location.search }}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Ver detalhes e salas
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
