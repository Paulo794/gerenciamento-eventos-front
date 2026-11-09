import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/ui/FeedbackStates';
import { useAuth } from '../../contexts/AuthContext';
import {
  createEvent,
  getEventById,
  getPublicEvents,
  updateEvent,
} from '../../services/eventService';
import type { EventViewModel } from '../../types/api';
import { parseApiDate, toDatetimeLocalInput, toSqlTimestamp } from '../../utils/dateUtils';

const MAX_NAME_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 255;

interface FormFieldErrors {
  name?: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

interface InitialSnapshot {
  name: string;
  address: string;
  startDate: string;
  endDate: string;
  description: string;
}

export function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const eventId = Number(id);

  const { institution } = useAuth();
  const navigate = useNavigate();

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [initialSnapshot, setInitialSnapshot] = useState<InitialSnapshot>({
    name: '',
    address: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [isLoadingEvent, setIsLoadingEvent] = useState<boolean>(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isForbiddenOwner, setIsForbiddenOwner] = useState<boolean>(false);

  const [allCalendarEvents, setAllCalendarEvents] = useState<EventViewModel[]>([]);
  const [conflictCheckError, setConflictCheckError] = useState<string | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState<boolean>(false);

  const institutionId = institution?.id ?? 0;

  const isDirty = useMemo(() => {
    return (
      name !== initialSnapshot.name ||
      address !== initialSnapshot.address ||
      startDate !== initialSnapshot.startDate ||
      endDate !== initialSnapshot.endDate ||
      description !== initialSnapshot.description
    );
  }, [name, address, startDate, endDate, description, initialSnapshot]);

  // Proteção contra fechamento/recarregamento acidental com alterações não salvas
  useEffect(() => {
    if (!isDirty || isSubmitting) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  // Carrega todos os eventos públicos (GET /events) para verificar conflitos na própria unidade e entre unidades
  const loadEventsForConflictCheck = useCallback(async () => {
    setIsCheckingConflicts(true);
    setConflictCheckError(null);
    try {
      const list = await getPublicEvents();
      setAllCalendarEvents(list);
    } catch {
      setConflictCheckError(
        'Não foi possível verificar conflitos de agenda no momento. Você ainda pode salvar o evento normalmente.',
      );
    } finally {
      setIsCheckingConflicts(false);
    }
  }, []);

  useEffect(() => {
    void loadEventsForConflictCheck();
  }, [loadEventsForConflictCheck]);

  const loadTargetEvent = useCallback(async () => {
    if (!isEditMode) return;
    if (!Number.isInteger(eventId) || eventId <= 0) {
      setLoadError('Identificador de evento inválido.');
      setIsLoadingEvent(false);
      return;
    }

    setIsLoadingEvent(true);
    setLoadError(null);
    setIsForbiddenOwner(false);
    try {
      const ev = await getEventById(eventId);
      if (institution && ev.institution_id !== institution.id) {
        setIsForbiddenOwner(true);
        return;
      }
      const formattedStart = toDatetimeLocalInput(ev.start_date);
      const formattedEnd = toDatetimeLocalInput(ev.end_date);
      setName(ev.name);
      setAddress(ev.address);
      setStartDate(formattedStart);
      setEndDate(formattedEnd);
      setDescription(ev.description);
      setInitialSnapshot({
        name: ev.name,
        address: ev.address,
        startDate: formattedStart,
        endDate: formattedEnd,
        description: ev.description,
      });
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Não foi possível carregar os dados do evento.',
      );
    } finally {
      setIsLoadingEvent(false);
    }
  }, [isEditMode, eventId, institution]);

  useEffect(() => {
    void loadTargetEvent();
  }, [loadTargetEvent]);

  // Alerta informativo (não-bloqueante) de sobreposição de horário:
  // (1) na mesma instituição e (2) com outras unidades cadastradas no calendário unificado.
  // Regra de fronteira: eventos estritamente consecutivos (fim A === início B) NÃO contam como conflito.
  const { sameInstitutionOverlaps, otherUnitsOverlaps } = useMemo(() => {
    if (!startDate || !endDate) {
      return { sameInstitutionOverlaps: [], otherUnitsOverlaps: [] };
    }
    const startMs = parseApiDate(startDate).getTime();
    const endMs = parseApiDate(endDate).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      return { sameInstitutionOverlaps: [], otherUnitsOverlaps: [] };
    }

    const sameInst: EventViewModel[] = [];
    const otherUnits: EventViewModel[] = [];

    for (const ev of allCalendarEvents) {
      if (isEditMode && ev.id === eventId) continue;
      const intersects = ev.startInstantMs < endMs && ev.endInstantMs > startMs;
      if (!intersects) continue;

      if (ev.institution_id === institutionId) {
        sameInst.push(ev);
      } else {
        otherUnits.push(ev);
      }
    }

    return { sameInstitutionOverlaps: sameInst, otherUnitsOverlaps: otherUnits };
  }, [startDate, endDate, allCalendarEvents, isEditMode, eventId, institutionId]);

  function validate(): boolean {
    const errors: FormFieldErrors = {};
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      errors.name = 'Informe o título do evento.';
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      errors.name = `O título deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`;
    }

    if (!trimmedAddress) {
      errors.address = 'Informe o endereço ou localização do evento.';
    } else if (trimmedAddress.length > MAX_ADDRESS_LENGTH) {
      errors.address = `O endereço deve ter no máximo ${MAX_ADDRESS_LENGTH} caracteres.`;
    }

    if (!startDate.trim()) {
      errors.startDate = 'Informe a data e o horário de início.';
    }

    if (!endDate.trim()) {
      errors.endDate = 'Informe a data e o horário de término.';
    }

    if (startDate.trim() && endDate.trim()) {
      const startMs = parseApiDate(startDate).getTime();
      const endMs = parseApiDate(endDate).getTime();
      if (Number.isNaN(startMs)) {
        errors.startDate = 'Data/horário de início inválido.';
      }
      if (Number.isNaN(endMs)) {
        errors.endDate = 'Data/horário de término inválido.';
      }
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs <= startMs) {
        errors.endDate = 'A data/horário de término deve ser estritamente posterior ao início.';
      }
    }

    // Decisão de produto (RF06 / SDD): descrição obrigatória tanto na criação quanto na edição
    if (!trimmedDescription) {
      errors.description = 'Informe a descrição do evento.';
    } else if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      errors.description = `A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`;
    }

    setFieldErrors(errors);

    if (errors.name) {
      nameInputRef.current?.focus();
    } else if (errors.address) {
      addressInputRef.current?.focus();
    } else if (errors.startDate) {
      startDateInputRef.current?.focus();
    } else if (errors.endDate) {
      endDateInputRef.current?.focus();
    } else if (errors.description) {
      descriptionInputRef.current?.focus();
    }

    return Object.keys(errors).length === 0;
  }

  function handleCancelOrBack(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isDirty && !isSubmitting) {
      const confirmed = window.confirm(
        'Você possui alterações não salvas neste formulário. Deseja realmente sair sem salvar?',
      );
      if (!confirmed) {
        e.preventDefault();
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    const payload = {
      name: name.trim(),
      address: address.trim(),
      start_date: toSqlTimestamp(startDate),
      end_date: toSqlTimestamp(endDate),
      description: description.trim(),
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await updateEvent(eventId, payload);
        navigate('/admin', {
          state: { feedbackMessage: `Evento "${payload.name}" atualizado com sucesso.` },
        });
      } else {
        await createEvent(payload, institution?.name ?? '');
        navigate('/admin', {
          state: { feedbackMessage: `Evento "${payload.name}" cadastrado com sucesso.` },
        });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Não foi possível salvar os dados do evento.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          to="/admin"
          onClick={handleCancelOrBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <span aria-hidden="true">&larr;</span>
          Voltar para Meus Eventos
        </Link>
      </div>

      {isLoadingEvent ? (
        <LoadingState message="Carregando dados do evento para edição..." />
      ) : isForbiddenOwner ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-xs"
        >
          <h1 className="text-lg font-bold">Operação não permitida para esta unidade</h1>
          <p className="mt-2 text-sm text-red-800">
            Somente a instituição proprietária que cadastrou este evento pode editá-lo ou gerenciar
            suas salas.
          </p>
          <Link
            to="/admin"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800"
          >
            Voltar ao Painel da Unidade
          </Link>
        </div>
      ) : loadError ? (
        <ErrorState
          title="Não foi possível carregar o evento"
          message={loadError}
          onRetry={loadTargetEvent}
        />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="border-b border-slate-200 pb-5">
            <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
              {institution?.name}
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
              {isEditMode ? 'Editar Evento Institucional' : 'Cadastrar Novo Evento'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Preencha os dados oficiais do evento. Os horários seguem o fuso oficial de Brasília.
            </p>
          </div>

          {submitError && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800"
            >
              {submitError}
            </div>
          )}

          {conflictCheckError && (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4 text-xs text-slate-700"
            >
              <span>{conflictCheckError}</span>
              <button
                type="button"
                onClick={() => void loadEventsForConflictCheck()}
                disabled={isCheckingConflicts}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
              >
                {isCheckingConflicts ? 'Verificando...' : 'Tentar verificar novamente'}
              </button>
            </div>
          )}

          {sameInstitutionOverlaps.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900"
            >
              <p className="font-bold">
                Aviso informativo: sobreposição de horário na sua unidade
              </p>
              <p className="mt-1">
                Sua instituição já possui {sameInstitutionOverlaps.length}{' '}
                {sameInstitutionOverlaps.length === 1
                  ? 'outro evento cadastrado'
                  : 'outros eventos cadastrados'}{' '}
                nesse mesmo intervalo de horário (
                {sameInstitutionOverlaps
                  .map((e) => `"${e.name}" (${e.formattedStartDate} até ${e.formattedEndDate})`)
                  .join('; ')}
                ). Caso ocorram em salas ou auditórios distintos, você pode prosseguir normalmente.
              </p>
            </div>
          )}

          {otherUnitsOverlaps.length > 0 && (
            <div
              role="status"
              aria-live="polite"
              className="mt-4 rounded-xl border border-sky-300 bg-sky-50 p-4 text-xs text-sky-950"
            >
              <p className="font-bold">
                Sincronia do Calendário Unificado: sobreposição com outra(s) unidade(s)
              </p>
              <p className="mt-1">
                {otherUnitsOverlaps.length === 1
                  ? 'Existe 1 evento de outra unidade agendado nesse mesmo intervalo:'
                  : `Existem ${otherUnitsOverlaps.length} eventos de outras unidades agendados nesse mesmo intervalo:`}
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {otherUnitsOverlaps.map((ev) => (
                  <li key={ev.id}>
                    <strong>{ev.institution_name || `Unidade #${ev.institution_id}`}</strong>:{' '}
                    &ldquo;{ev.name}&rdquo; ({ev.formattedStartDate} até {ev.formattedEndDate})
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-sky-900">
                Este aviso é apenas informativo para apoiar a sincronia de agendas entre as Fatecs e
                não bloqueia o salvamento do evento.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            {/* Nome do Evento */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="event-name" className="block text-xs font-bold text-slate-800">
                  Título do evento <span className="text-red-700">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {name.length}/{MAX_NAME_LENGTH}
                </span>
              </div>
              <input
                ref={nameInputRef}
                id="event-name"
                type="text"
                maxLength={MAX_NAME_LENGTH}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Ex: Semana de Tecnologia e Sistemas Inteligentes"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'event-name-error' : undefined}
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
              />
              {fieldErrors.name && (
                <p
                  id="event-name-error"
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-700"
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Endereço / Localização */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="event-address" className="block text-xs font-bold text-slate-800">
                  Endereço / Localização <span className="text-red-700">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {address.length}/{MAX_ADDRESS_LENGTH}
                </span>
              </div>
              <input
                ref={addressInputRef}
                id="event-address"
                type="text"
                maxLength={MAX_ADDRESS_LENGTH}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (fieldErrors.address) {
                    setFieldErrors((prev) => ({ ...prev, address: undefined }));
                  }
                }}
                placeholder="Ex: Av. Shunji Nishimura, 605 - Distrito Industrial, Pompeia - SP"
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={fieldErrors.address ? 'event-address-error' : undefined}
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
              />
              {fieldErrors.address && (
                <p
                  id="event-address-error"
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-700"
                >
                  {fieldErrors.address}
                </p>
              )}
            </div>

            {/* Datas de Início e Término */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="event-start-date"
                  className="block text-xs font-bold text-slate-800"
                >
                  Data e hora de início <span className="text-red-700">*</span>
                </label>
                <input
                  ref={startDateInputRef}
                  id="event-start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (fieldErrors.startDate || fieldErrors.endDate) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        startDate: undefined,
                        endDate: undefined,
                      }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.startDate)}
                  aria-describedby={fieldErrors.startDate ? 'event-start-error' : undefined}
                  disabled={isSubmitting}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
                />
                {fieldErrors.startDate && (
                  <p
                    id="event-start-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-red-700"
                  >
                    {fieldErrors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="event-end-date" className="block text-xs font-bold text-slate-800">
                  Data e hora de término <span className="text-red-700">*</span>
                </label>
                <input
                  ref={endDateInputRef}
                  id="event-end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (fieldErrors.endDate) {
                      setFieldErrors((prev) => ({ ...prev, endDate: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.endDate)}
                  aria-describedby={fieldErrors.endDate ? 'event-end-error' : undefined}
                  disabled={isSubmitting}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
                />
                {fieldErrors.endDate && (
                  <p
                    id="event-end-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-red-700"
                  >
                    {fieldErrors.endDate}
                  </p>
                )}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="event-description"
                  className="block text-xs font-bold text-slate-800"
                >
                  Descrição do evento <span className="text-red-700">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <textarea
                ref={descriptionInputRef}
                id="event-description"
                rows={4}
                maxLength={MAX_DESCRIPTION_LENGTH}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) {
                    setFieldErrors((prev) => ({ ...prev, description: undefined }));
                  }
                }}
                placeholder="Descreva o público-alvo, programação resumida e informações importantes para os participantes..."
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={fieldErrors.description ? 'event-description-error' : undefined}
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
              />
              {fieldErrors.description && (
                <p
                  id="event-description-error"
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-700"
                >
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5">
              <Link
                to="/admin"
                onClick={handleCancelOrBack}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? isEditMode
                    ? 'Salvando alterações...'
                    : 'Publicando evento...'
                  : isEditMode
                    ? 'Salvar alterações'
                    : 'Publicar evento'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
