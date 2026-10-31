import type { PeriodFilter, TemporalEventStatus } from '../../types/api';

export interface InstitutionOption {
  id: number;
  name: string;
}

interface EventFiltersProps {
  searchQuery: string;
  institutionId: string;
  period: PeriodFilter;
  statusFilter: TemporalEventStatus | 'ALL';
  institutions: InstitutionOption[];
  totalResults: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onInstitutionChange: (value: string) => void;
  onPeriodChange: (value: PeriodFilter) => void;
  onStatusChange: (value: TemporalEventStatus | 'ALL') => void;
  onClearFilters: () => void;
}

export function EventFilters({
  searchQuery,
  institutionId,
  period,
  statusFilter,
  institutions,
  totalResults,
  hasActiveFilters,
  onSearchChange,
  onInstitutionChange,
  onPeriodChange,
  onStatusChange,
  onClearFilters,
}: EventFiltersProps) {
  return (
    <section
      aria-label="Filtros de pesquisa de eventos"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-1">
          <label
            htmlFor="filter-search"
            className="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
          >
            Buscar por nome ou endereço
          </label>
          <input
            id="filter-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Ex: Semana de Tecnologia, Pompeia..."
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/20"
          />
        </div>

        <div>
          <label
            htmlFor="filter-institution"
            className="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
          >
            Unidade / Instituição
          </label>
          <select
            id="filter-institution"
            value={institutionId}
            onChange={(e) => onInstitutionChange(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/20"
          >
            <option value="">Todas as unidades com eventos</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={String(inst.id)}>
                {inst.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-period"
            className="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
          >
            Período
          </label>
          <select
            id="filter-period"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as PeriodFilter)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/20"
          >
            <option value="ALL">Qualquer período</option>
            <option value="TODAY">Hoje</option>
            <option value="NEXT_7_DAYS">Próximos 7 dias</option>
            <option value="THIS_MONTH">Este mês</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-status"
            className="block text-xs font-semibold tracking-wide text-slate-700 uppercase"
          >
            Status temporal
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as TemporalEventStatus | 'ALL')}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/20"
          >
            <option value="ALL">Todos os status</option>
            <option value="AGENDADO">Agendado</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="ENCERRADO">Encerrado</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <p aria-live="polite">
          Exibindo <strong className="font-semibold text-slate-900">{totalResults}</strong>{' '}
          {totalResults === 1 ? 'evento encontrado' : 'eventos encontrados'}
        </p>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="font-semibold text-red-700 hover:text-red-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </section>
  );
}
