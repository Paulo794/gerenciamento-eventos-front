import type { TemporalEventStatus } from '../../types/api';

interface TemporalBadgeProps {
  status: TemporalEventStatus;
}

const STATUS_CONFIG: Record<
  TemporalEventStatus,
  { label: string; classes: string; dotClasses: string }
> = {
  AGENDADO: {
    label: 'Agendado',
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClasses: 'bg-emerald-600',
  },
  EM_ANDAMENTO: {
    label: 'Em andamento',
    classes: 'bg-blue-50 text-blue-800 border-blue-200',
    dotClasses: 'bg-blue-600 animate-pulse',
  },
  ENCERRADO: {
    label: 'Encerrado',
    classes: 'bg-slate-100 text-slate-700 border-slate-300',
    dotClasses: 'bg-slate-500',
  },
};

export function TemporalBadge({ status }: TemporalBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.classes}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${config.dotClasses}`} />
      <span>Status: {config.label}</span>
    </span>
  );
}
