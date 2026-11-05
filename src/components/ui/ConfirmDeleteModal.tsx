import { useEffect, useRef, type RefObject } from 'react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  eventName: string;
  isDeleting: boolean;
  errorMessage?: string | null;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  eventName,
  isDeleting,
  errorMessage,
  fallbackFocusRef,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        triggerElementRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
        cancelButtonRef.current?.focus();
      }
    } else if (dialog.open) {
      dialog.close();
      const trigger = triggerElementRef.current;
      if (trigger && document.body.contains(trigger)) {
        trigger.focus();
      } else if (fallbackFocusRef?.current && document.body.contains(fallbackFocusRef.current)) {
        fallbackFocusRef.current.focus();
      }
      triggerElementRef.current = null;
    }
  }, [isOpen, fallbackFocusRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  function handleDialogCancel(event: React.SyntheticEvent<HTMLDialogElement, Event>) {
    event.preventDefault();
    if (isDeleting) {
      return;
    }
    onCancel();
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    if (isDeleting) return;
    if (event.target === dialogRef.current) {
      onCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleDialogCancel}
      onClick={handleBackdropClick}
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-description"
      className="m-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-[2px]"
    >
      {isOpen && (
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700"
            >
              !
            </div>
            <div className="flex-1">
              <h2 id="confirm-delete-title" className="text-lg font-bold text-slate-900">
                Confirmar exclusão do evento
              </h2>
              <p id="confirm-delete-description" className="mt-2 text-sm text-slate-600">
                Você está prestes a excluir permanentemente o evento abaixo e todas as salas
                vinculadas a ele:
              </p>
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm font-bold text-red-900">
                {eventName}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Esta ação realiza a remoção definitiva no sistema e não pode ser desfeita.
              </p>

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-medium text-red-800"
                >
                  {errorMessage}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              ref={cancelButtonRef}
              type="button"
              disabled={isDeleting}
              onClick={onCancel}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Excluindo evento...' : 'Sim, excluir evento'}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
