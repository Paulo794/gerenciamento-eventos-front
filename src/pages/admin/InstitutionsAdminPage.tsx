import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createInstitution, getInstitutionById } from '../../services/institutionService';
import type { ApiInstitution } from '../../types/api';

const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;
const MIN_PASSWORD_LENGTH = 6;
const CNPJ_LENGTH = 14;

interface CreateInstitutionErrors {
  name?: string;
  email?: string;
  password?: string;
  cnpj?: string;
}

export function InstitutionsAdminPage() {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const cnpjInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const lookupInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [isAdminAccount, setIsAdminAccount] = useState<boolean>(false);

  const [fieldErrors, setFieldErrors] = useState<CreateInstitutionErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdInstitution, setCreatedInstitution] = useState<ApiInstitution | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Consulta de Instituição por ID
  const [lookupIdInput, setLookupIdInput] = useState<string>('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookedUpInstitution, setLookedUpInstitution] = useState<ApiInstitution | null>(null);

  const isFormDirty = useMemo(() => {
    return Boolean(name.trim() || email.trim() || password || cnpj.trim() || isAdminAccount);
  }, [name, email, password, cnpj, isAdminAccount]);

  useEffect(() => {
    if (!isFormDirty || isSubmitting) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty, isSubmitting]);

  function normalizeCnpjDigits(raw: string): string {
    return raw.replace(/\D/g, '');
  }

  function validateCreate(): boolean {
    const errors: CreateInstitutionErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const cnpjDigits = normalizeCnpjDigits(cnpj);

    if (!trimmedName) {
      errors.name = 'Informe o nome da instituição / unidade Fatec.';
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      errors.name = `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`;
    }

    if (!trimmedEmail) {
      errors.email = 'Informe o e-mail institucional.';
    } else if (!trimmedEmail.includes('@')) {
      errors.email = 'O e-mail deve conter o caractere "@".';
    } else if (trimmedEmail.length > MAX_EMAIL_LENGTH) {
      errors.email = `O e-mail deve ter no máximo ${MAX_EMAIL_LENGTH} caracteres.`;
    }

    if (!cnpjDigits) {
      errors.cnpj = 'Informe o CNPJ da instituição.';
    } else if (cnpjDigits.length !== CNPJ_LENGTH) {
      errors.cnpj = `O CNPJ deve conter exatamente ${CNPJ_LENGTH} dígitos numéricos.`;
    }

    if (!password) {
      errors.password = 'Defina uma senha inicial para a instituição.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }

    setFieldErrors(errors);

    if (errors.name) {
      nameInputRef.current?.focus();
    } else if (errors.email) {
      emailInputRef.current?.focus();
    } else if (errors.cnpj) {
      cnpjInputRef.current?.focus();
    } else if (errors.password) {
      passwordInputRef.current?.focus();
    }

    return Object.keys(errors).length === 0;
  }

  function handleBackClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isFormDirty && !isSubmitting) {
      const confirmed = window.confirm(
        'Você iniciou o preenchimento de uma nova instituição. Deseja realmente sair sem concluir o cadastro?',
      );
      if (!confirmed) {
        e.preventDefault();
      }
    }
  }

  async function handleCreateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setCreatedInstitution(null);

    if (!validateCreate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createInstitution({
        name: name.trim(),
        email: email.trim(),
        password,
        cnpj: normalizeCnpjDigits(cnpj),
        is_admin: isAdminAccount,
      });
      setCreatedInstitution(result);
      setName('');
      setEmail('');
      setPassword('');
      setCnpj('');
      setIsAdminAccount(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Não foi possível cadastrar a instituição. Verifique se o nome ou e-mail já existem.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLookupSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLookupError(null);
    setLookedUpInstitution(null);

    const parsedId = Number(lookupIdInput.trim());
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setLookupError('Informe um código numérico inteiro maior que zero.');
      lookupInputRef.current?.focus();
      return;
    }

    setIsLookingUp(true);
    try {
      const inst = await getInstitutionById(parsedId);
      setLookedUpInstitution(inst);
    } catch (err) {
      setLookupError(
        err instanceof Error
          ? err.message
          : 'Instituição não encontrada para o código informado.',
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/admin"
          onClick={handleBackClick}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <span aria-hidden="true">&larr;</span>
          Voltar para Meus Eventos
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Coluna Principal: Cadastro de Nova Instituição */}
        <section
          aria-labelledby="create-institution-heading"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 lg:col-span-2"
        >
          <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            Administração Geral — CEETEPS
          </span>
          <h1
            id="create-institution-heading"
            className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900"
          >
            Cadastrar Nova Instituição / Unidade Fatec
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Crie o acesso institucional para uma unidade Fatec publicar e gerenciar seus eventos.
          </p>

          {submitError && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800"
            >
              {submitError}
            </div>
          )}

          {createdInstitution && (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900"
            >
              <p className="font-bold">Instituição cadastrada com sucesso!</p>
              <p className="mt-1">
                <strong>Código #{createdInstitution.id}</strong> — {createdInstitution.name} (
                {createdInstitution.email})
              </p>
              <Link
                to={`/instituicoes/${createdInstitution.id}`}
                state={{ fromPath: '/admin/instituicoes' }}
                className="mt-2 inline-block font-semibold text-emerald-800 underline hover:text-emerald-950"
              >
                Visualizar página pública da instituição &rarr;
              </Link>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="inst-name" className="block text-xs font-bold text-slate-800">
                  Nome da Instituição / Fatec <span className="text-red-700">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {name.length}/{MAX_NAME_LENGTH}
                </span>
              </div>
              <input
                ref={nameInputRef}
                id="inst-name"
                type="text"
                maxLength={MAX_NAME_LENGTH}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Ex: Fatec Shunji Nishimura - Pompeia"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'inst-name-error' : undefined}
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
              />
              {fieldErrors.name && (
                <p
                  id="inst-name-error"
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-700"
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="inst-email" className="block text-xs font-bold text-slate-800">
                E-mail institucional de acesso <span className="text-red-700">*</span>
              </label>
              <input
                ref={emailInputRef}
                id="inst-email"
                type="email"
                maxLength={MAX_EMAIL_LENGTH}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="Ex: f259acad@cps.sp.gov.br"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'inst-email-error' : undefined}
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
              />
              {fieldErrors.email && (
                <p
                  id="inst-email-error"
                  role="alert"
                  className="mt-1 text-xs font-medium text-red-700"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="inst-cnpj" className="block text-xs font-bold text-slate-800">
                    CNPJ (14 dígitos) <span className="text-red-700">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {normalizeCnpjDigits(cnpj).length}/{CNPJ_LENGTH} dígitos
                  </span>
                </div>
                <input
                  ref={cnpjInputRef}
                  id="inst-cnpj"
                  type="text"
                  inputMode="numeric"
                  maxLength={18}
                  value={cnpj}
                  onChange={(e) => {
                    setCnpj(e.target.value);
                    if (fieldErrors.cnpj) setFieldErrors((prev) => ({ ...prev, cnpj: undefined }));
                  }}
                  placeholder="62823257025900"
                  aria-invalid={Boolean(fieldErrors.cnpj)}
                  aria-describedby={fieldErrors.cnpj ? 'inst-cnpj-error' : undefined}
                  disabled={isSubmitting}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
                />
                {fieldErrors.cnpj && (
                  <p
                    id="inst-cnpj-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-red-700"
                  >
                    {fieldErrors.cnpj}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="inst-password" className="block text-xs font-bold text-slate-800">
                  Senha inicial (mín. 6 caracteres) <span className="text-red-700">*</span>
                </label>
                <input
                  ref={passwordInputRef}
                  id="inst-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="Mínimo de 6 caracteres"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'inst-password-error' : undefined}
                  disabled={isSubmitting}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
                />
                {fieldErrors.password && (
                  <p
                    id="inst-password-error"
                    role="alert"
                    className="mt-1 text-xs font-medium text-red-700"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <input
                id="inst-is-admin"
                type="checkbox"
                checked={isAdminAccount}
                onChange={(e) => setIsAdminAccount(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-700"
              />
              <div>
                <label htmlFor="inst-is-admin" className="block text-xs font-bold text-slate-800">
                  Conceder privilégio de Administrador Geral
                </label>
                <p className="text-xs text-slate-600">
                  Contas administradoras podem cadastrar novas instituições no sistema.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {isSubmitting ? 'Cadastrando instituição...' : 'Cadastrar Instituição'}
              </button>
            </div>
          </form>
        </section>

        {/* Coluna Lateral: Consulta de Instituição por Código */}
        <aside
          aria-labelledby="lookup-institution-heading"
          className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <h2 id="lookup-institution-heading" className="text-base font-bold text-slate-900">
            Consultar Instituição por Código
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Consulte os dados cadastrais de uma unidade pelo seu código identificador numérico.
          </p>

          <form onSubmit={handleLookupSubmit} noValidate className="mt-4 space-y-3">
            <div>
              <label htmlFor="lookup-inst-id" className="block text-xs font-bold text-slate-800">
                Código da Instituição (ID)
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  ref={lookupInputRef}
                  id="lookup-inst-id"
                  type="number"
                  min={1}
                  value={lookupIdInput}
                  onChange={(e) => {
                    setLookupIdInput(e.target.value);
                    if (lookupError) setLookupError(null);
                  }}
                  placeholder="Ex: 1"
                  aria-invalid={Boolean(lookupError)}
                  aria-describedby={lookupError ? 'lookup-inst-error' : undefined}
                  disabled={isLookingUp}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-700 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isLookingUp}
                  className="shrink-0 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {isLookingUp ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {lookupError && (
              <p id="lookup-inst-error" role="alert" className="text-xs font-medium text-red-700">
                {lookupError}
              </p>
            )}
          </form>

          {lookedUpInstitution && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900">Código #{lookedUpInstitution.id}</span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                  {lookedUpInstitution.is_admin ? 'Admin' : 'Unidade'}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-slate-900">{lookedUpInstitution.name}</p>
              {lookedUpInstitution.email && (
                <p className="mt-1 text-slate-600">E-mail: {lookedUpInstitution.email}</p>
              )}
              {lookedUpInstitution.cnpj && (
                <p className="mt-0.5 text-slate-600">CNPJ: {lookedUpInstitution.cnpj}</p>
              )}
              <Link
                to={`/instituicoes/${lookedUpInstitution.id}`}
                state={{ fromPath: '/admin/instituicoes' }}
                className="mt-3 inline-block font-semibold text-red-700 hover:underline"
              >
                Ver página e eventos da unidade &rarr;
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
