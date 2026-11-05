import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addRoomToEvent,
  deleteRoomFromEvent,
  editRoomInEvent,
  getRoomsByEventId,
} from '../../services/eventService';
import type { ApiRoomEvent, EventViewModel } from '../../types/api';

interface RoomManagerModalProps {
  event: EventViewModel | null;
  onClose: () => void;
}

const MAX_ROOM_NAME_LENGTH = 100;

export function RoomManagerModal({ event, onClose }: RoomManagerModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const newRoomInputRef = useRef<HTMLInputElement | null>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const requestSessionIdRef = useRef<number>(0);

  const [rooms, setRooms] = useState<ApiRoomEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newRoomName, setNewRoomName] = useState<string>('');
  const [newRoomError, setNewRoomError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editingRoomName, setEditingRoomName] = useState<string>('');
  const [editingError, setEditingError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);

  const isOpen = Boolean(event);
  const eventId = event?.id ?? 0;

  const isMutating = isAdding || isSavingEdit || deletingRoomId !== null;
  const isInteractionLocked = isLoading || isMutating;

  const loadRooms = useCallback(async (targetEventId: number, sessionId: number) => {
    if (!targetEventId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const list = await getRoomsByEventId(targetEventId);
      if (requestSessionIdRef.current !== sessionId) {
        return;
      }
      setRooms(list);
    } catch (err) {
      if (requestSessionIdRef.current !== sessionId) {
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as salas vinculadas a este evento.',
      );
    } finally {
      if (requestSessionIdRef.current === sessionId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Invalida qualquer requisição anterior ao abrir outro evento ou fechar o modal
    requestSessionIdRef.current += 1;
    const currentSessionId = requestSessionIdRef.current;

    if (isOpen && eventId) {
      if (!dialog.open) {
        triggerElementRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        dialog.showModal();
      }
      setRooms([]);
      setErrorMessage(null);
      setNewRoomName('');
      setNewRoomError(null);
      setIsAdding(false);
      setEditingRoomId(null);
      setEditingRoomName('');
      setEditingError(null);
      setIsSavingEdit(false);
      setDeletingRoomId(null);

      void loadRooms(eventId, currentSessionId);
      window.setTimeout(() => {
        newRoomInputRef.current?.focus();
      }, 50);
    } else if (dialog.open) {
      dialog.close();
      setRooms([]);
      setIsLoading(false);
      setIsAdding(false);
      setIsSavingEdit(false);
      setDeletingRoomId(null);
      const trigger = triggerElementRef.current;
      if (trigger && document.body.contains(trigger)) {
        trigger.focus();
      }
      triggerElementRef.current = null;
    }
  }, [isOpen, eventId, loadRooms]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      requestSessionIdRef.current += 1;
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  function handleDialogCancel(e: React.SyntheticEvent<HTMLDialogElement, Event>) {
    e.preventDefault();
    if (isMutating) {
      return;
    }
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (isMutating) return;
    if (e.target === dialogRef.current) {
      onClose();
    }
  }

  function handleRefreshClick() {
    if (!event || isInteractionLocked) return;
    requestSessionIdRef.current += 1;
    void loadRooms(event.id, requestSessionIdRef.current);
  }

  async function handleAddRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!event || isInteractionLocked) return;

    const trimmed = newRoomName.trim();
    if (!trimmed) {
      setNewRoomError('Informe o nome da sala ou espaço.');
      newRoomInputRef.current?.focus();
      return;
    }
    if (trimmed.length > MAX_ROOM_NAME_LENGTH) {
      setNewRoomError(`O nome da sala deve ter no máximo ${MAX_ROOM_NAME_LENGTH} caracteres.`);
      newRoomInputRef.current?.focus();
      return;
    }

    const sessionId = requestSessionIdRef.current;
    setIsAdding(true);
    setNewRoomError(null);
    setErrorMessage(null);
    try {
      const updatedList = await addRoomToEvent(event.id, { name: trimmed });
      if (requestSessionIdRef.current !== sessionId) return;
      setRooms(updatedList);
      setNewRoomName('');
      newRoomInputRef.current?.focus();
    } catch (err) {
      if (requestSessionIdRef.current !== sessionId) return;
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível adicionar a sala ao evento.',
      );
    } finally {
      if (requestSessionIdRef.current === sessionId) {
        setIsAdding(false);
      }
    }
  }

  function startEditing(room: ApiRoomEvent) {
    if (isInteractionLocked) return;
    setEditingRoomId(room.room_id);
    setEditingRoomName(room.name);
    setEditingError(null);
    setErrorMessage(null);
  }

  function cancelEditing() {
    if (isSavingEdit) return;
    setEditingRoomId(null);
    setEditingRoomName('');
    setEditingError(null);
  }

  async function handleSaveEdit(roomId: number) {
    if (!event || isInteractionLocked) return;
    const trimmed = editingRoomName.trim();
    if (!trimmed) {
      setEditingError('O nome da sala não pode ficar vazio.');
      return;
    }
    if (trimmed.length > MAX_ROOM_NAME_LENGTH) {
      setEditingError(`Máximo de ${MAX_ROOM_NAME_LENGTH} caracteres.`);
      return;
    }

    const sessionId = requestSessionIdRef.current;
    setIsSavingEdit(true);
    setEditingError(null);
    setErrorMessage(null);
    try {
      const updatedRoom = await editRoomInEvent(event.id, {
        room_id: roomId,
        name: trimmed,
      });
      if (requestSessionIdRef.current !== sessionId) return;
      setRooms((prev) =>
        prev.map((item) => (item.room_id === roomId ? { ...item, name: updatedRoom.name } : item)),
      );
      setEditingRoomId(null);
      setEditingRoomName('');
    } catch (err) {
      if (requestSessionIdRef.current !== sessionId) return;
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível atualizar o nome da sala.',
      );
    } finally {
      if (requestSessionIdRef.current === sessionId) {
        setIsSavingEdit(false);
      }
    }
  }

  async function handleDeleteRoom(roomId: number) {
    if (!event || isInteractionLocked) return;
    const sessionId = requestSessionIdRef.current;
    setDeletingRoomId(roomId);
    setErrorMessage(null);
    try {
      await deleteRoomFromEvent(event.id, { room_id: roomId });
      if (requestSessionIdRef.current !== sessionId) return;
      setRooms((prev) => prev.filter((item) => item.room_id !== roomId));
      if (editingRoomId === roomId) {
        setEditingRoomId(null);
        setEditingRoomName('');
        setEditingError(null);
      }
    } catch (err) {
      if (requestSessionIdRef.current !== sessionId) return;
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível remover a sala selecionada.',
      );
    } finally {
      if (requestSessionIdRef.current === sessionId) {
        setDeletingRoomId(null);
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleDialogCancel}
      onClick={handleBackdropClick}
      aria-labelledby="room-manager-title"
      aria-describedby="room-manager-subtitle"
      className="m-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-[2px]"
    >
      {event && (
        <div className="flex max-h-[85vh] flex-col">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div>
              <span className="text-xs font-bold tracking-wide text-red-700 uppercase">
                Gestão de Salas e Espaços
              </span>
              <h2 id="room-manager-title" className="mt-1 text-lg font-extrabold text-slate-900">
                {event.name}
              </h2>
              <p id="room-manager-subtitle" className="mt-0.5 text-xs text-slate-600">
                Cadastre auditórios, laboratórios ou salas onde ocorrerão as atividades deste
                evento.
              </p>
            </div>
            <button
              type="button"
              disabled={isMutating}
              onClick={onClose}
              aria-label="Fechar gerenciador de salas"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
            >
              Fechar
            </button>
          </div>

          {/* Corpo rolável */}
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Formulário de Nova Sala */}
            <form onSubmit={handleAddRoom} noValidate className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="new-room-name" className="block text-xs font-bold text-slate-800">
                  Adicionar nova sala / espaço <span className="text-red-700">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {newRoomName.length}/{MAX_ROOM_NAME_LENGTH}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  ref={newRoomInputRef}
                  id="new-room-name"
                  type="text"
                  maxLength={MAX_ROOM_NAME_LENGTH}
                  value={newRoomName}
                  onChange={(e) => {
                    setNewRoomName(e.target.value);
                    if (newRoomError) setNewRoomError(null);
                  }}
                  placeholder="Ex: Auditório Shunji Nishimura, Lab. de IA 02..."
                  aria-invalid={Boolean(newRoomError)}
                  aria-describedby={newRoomError ? 'new-room-error' : undefined}
                  disabled={isInteractionLocked}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700/20 disabled:bg-slate-100"
                />
                <button
                  type="submit"
                  disabled={isInteractionLocked}
                  className="shrink-0 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdding ? 'Adicionando...' : 'Adicionar sala'}
                </button>
              </div>
              {newRoomError && (
                <p id="new-room-error" role="alert" className="text-xs font-medium text-red-700">
                  {newRoomError}
                </p>
              )}
            </form>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800"
              >
                {errorMessage}
              </div>
            )}

            {/* Lista de Salas Cadastradas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-bold tracking-wide text-slate-600 uppercase">
                  Salas vinculadas ({rooms.length})
                </h3>
                <button
                  type="button"
                  onClick={handleRefreshClick}
                  disabled={isInteractionLocked}
                  className="text-xs font-semibold text-red-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
                >
                  Atualizar lista
                </button>
              </div>

              {isLoading ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600"
                >
                  Carregando salas do evento...
                </div>
              ) : rooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  Nenhuma sala cadastrada para este evento ainda. Utilize o campo acima para incluir
                  a primeira sala.
                </div>
              ) : (
                <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {rooms.map((room) => {
                    const isEditingThis = editingRoomId === room.room_id;
                    const isDeletingThis = deletingRoomId === room.room_id;

                    return (
                      <li key={room.room_id} className="p-3.5">
                        {isEditingThis ? (
                          <div className="space-y-2">
                            <label
                              htmlFor={`edit-room-${room.room_id}`}
                              className="block text-xs font-semibold text-slate-700"
                            >
                              Renomear sala #{room.room_id}
                            </label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                id={`edit-room-${room.room_id}`}
                                type="text"
                                maxLength={MAX_ROOM_NAME_LENGTH}
                                value={editingRoomName}
                                onChange={(e) => {
                                  setEditingRoomName(e.target.value);
                                  if (editingError) setEditingError(null);
                                }}
                                disabled={isInteractionLocked}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-red-700 focus:outline-none"
                              />
                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isInteractionLocked}
                                  onClick={() => void handleSaveEdit(room.room_id)}
                                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                                >
                                  {isSavingEdit ? 'Salvando...' : 'Salvar'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isInteractionLocked}
                                  onClick={cancelEditing}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                            {editingError && (
                              <p role="alert" className="text-xs font-medium text-red-700">
                                {editingError}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                aria-hidden="true"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-50 text-xs font-bold text-red-700"
                              >
                                #
                              </span>
                              <span className="text-sm font-medium text-slate-900">{room.name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isInteractionLocked}
                                onClick={() => startEditing(room)}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
                              >
                                Renomear
                              </button>
                              <button
                                type="button"
                                disabled={isInteractionLocked}
                                onClick={() => void handleDeleteRoom(room.room_id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
                              >
                                {isDeletingThis ? 'Removendo...' : 'Remover'}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
