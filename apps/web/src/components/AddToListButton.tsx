/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import { addItemToList, createList, fetchListBySlug, fetchMyLists, removeItemFromList } from "@/lib/lists";
import type { ListDetail, ListItem, ListItemGame, ListSummary } from "@/types";

interface AddToListButtonProps {
  game: ListItemGame;
}

interface ListState {
  summary: ListSummary;
  containsGame: boolean;
  isSaving: boolean;
  error?: string | null;
}

function normalizeGameName(title: string) {
  return title.length > 40 ? `${title.slice(0, 37)}...` : title;
}

export function AddToListButton({ game }: AddToListButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lists, setLists] = useState<ListState[]>([]);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedRef = useRef(false);

  const [newListTitle, setNewListTitle] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newListPublic, setNewListPublic] = useState(true);
  const [creatingList, setCreatingList] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const orderedLists = useMemo(() => lists, [lists]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === overlayRef.current) {
        close();
      }
    },
    [close],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open || hasLoadedRef.current) {
      return;
    }

    let active = true;
    hasLoadedRef.current = true;

    const loadLists = async () => {
      setLoading(true);
      setError(null);
      try {
        const myLists = await fetchMyLists();
        const detailed = await Promise.all(
          myLists.map(async (summary) => {
            try {
              const detail = await fetchListBySlug(summary.slug);
              const contains =
                detail.items?.some((item) => item.game.slug === game.slug) ??
                summary.items_preview?.some((item) => item.game.slug === game.slug) ??
                false;

              return {
                summary,
                containsGame: contains,
                isSaving: false,
                error: null,
              } satisfies ListState;
            } catch (fetchError) {
              console.error("Failed to load list detail", fetchError);
              return {
                summary,
                containsGame:
                  summary.items_preview?.some((item) => item.game.slug === game.slug) ?? false,
                isSaving: false,
                error: "No se pudo cargar la lista",
              } satisfies ListState;
            }
          }),
        );

        if (!active) return;
        setLists(detailed);
      } catch (fetchError) {
        console.error("Failed to load lists", fetchError);
        if (!active) return;
        setError(
          fetchError instanceof ApiError ? fetchError.message : "No se pudieron cargar tus listas",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadLists();

    return () => {
      active = false;
    };
  }, [open, game.slug]);

  useEffect(() => {
    if (!open) {
      setCreatingList(false);
      setCreateError(null);
      setNewListTitle("");
      setNewListDescription("");
      setNewListPublic(true);
    }
  }, [open]);

  const updateListState = useCallback((slug: string, updater: (prev: ListState) => ListState) => {
    setLists((prev) =>
      prev.map((entry) => (entry.summary.slug === slug ? updater(entry) : entry)),
    );
  }, []);

  const handleCreateList = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const title = newListTitle.trim();
      if (!title.length) {
        setCreateError("El titulo es obligatorio");
        return;
      }

      setCreatingList(true);
      setCreateError(null);

      try {
        const created = await createList({
          title,
          description: newListDescription.trim() || undefined,
          isPublic: newListPublic,
        });

        const createdEntry: ListState = {
          summary: created,
          containsGame: false,
          isSaving: false,
          error: null,
        };

        setLists((prev) => [...prev, createdEntry]);

        try {
          await addItemToList(created.slug, game.slug);
          updateListState(created.slug, (current) => ({
            ...current,
            containsGame: true,
            summary: {
              ...current.summary,
              items_count: current.summary.items_count + 1,
            },
          }));
        } catch (addError) {
          console.error("Failed to auto-add game to new list", addError);
          setCreateError(
            addError instanceof ApiError
              ? addError.message ??
                  "La lista se creo pero no pudimos agregar el juego automaticamente, intentalo de nuevo."
              : "La lista se creo pero no pudimos agregar el juego automaticamente, intentalo de nuevo.",
          );
        }

        setNewListTitle("");
        setNewListDescription("");
        setNewListPublic(true);
      } catch (createErr) {
        console.error("Failed to create list", createErr);
        setCreateError(
          createErr instanceof ApiError
            ? createErr.message ?? "No se pudo crear la lista"
            : "No se pudo crear la lista",
        );
      } finally {
        setCreatingList(false);
      }
    },
    [game.slug, newListDescription, newListPublic, newListTitle, updateListState],
  );

  const handleToggleList = useCallback(
    async (list: ListState) => {
      updateListState(list.summary.slug, (current) => ({ ...current, isSaving: true, error: null }));

      try {
        if (list.containsGame) {
          await removeItemFromList(list.summary.slug, game.slug);
          updateListState(list.summary.slug, (current) => ({
            ...current,
            isSaving: false,
            containsGame: false,
          }));
        } else {
          await addItemToList(list.summary.slug, game.slug);
          updateListState(list.summary.slug, (current) => ({
            ...current,
            isSaving: false,
            containsGame: true,
          }));
        }
      } catch (mutationError) {
        console.error("Failed to update list item", mutationError);
        updateListState(list.summary.slug, (current) => ({
          ...current,
          isSaving: false,
          error:
            mutationError instanceof ApiError
              ? mutationError.message ?? "No se pudo actualizar la lista"
              : "No se pudo actualizar la lista",
        }));
      }
    },
    [game.slug, updateListState],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        Agregar a lista
      </button>

      {open ? (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
        >
          <div className="max-h-full w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
            <header className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Agregar a listas
                </p>
                <h2 className="text-lg font-semibold text-text">
                  {normalizeGameName(game.title)}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase text-text-muted transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                Cerrar
              </button>
            </header>

            <div className="flex flex-col gap-4 overflow-y-auto px-6 py-5">
              <form
                onSubmit={handleCreateList}
                className="space-y-3 rounded-2xl border border-border bg-surface/70 p-4"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Crear nueva lista
                  </p>
                  <input
                    value={newListTitle}
                    onChange={(event) => setNewListTitle(event.target.value)}
                    placeholder="Titulo"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  />
                </div>
                <textarea
                  value={newListDescription}
                  onChange={(event) => setNewListDescription(event.target.value)}
                  rows={3}
                  placeholder="Descripcion (opcional)"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
                <label className="flex items-center gap-2 text-xs text-text">
                  <input
                    type="checkbox"
                    checked={newListPublic}
                    onChange={(event) => setNewListPublic(event.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Lista publica
                </label>
                {createError ? <p className="text-xs text-danger">{createError}</p> : null}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingList}
                    className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase text-primary-contrast transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingList ? "Creando..." : "Crear y agregar"}
                  </button>
                </div>
              </form>

              {loading ? (
                <p className="text-sm text-text-muted">Cargando tus listas...</p>
              ) : null}
              {error ? (
                <p className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              ) : null}

              {orderedLists.length ? (
                <ul className="space-y-3">
                  {orderedLists.map((list) => (
                    <li
                      key={list.summary.id}
                      className="rounded-2xl border border-border bg-surface/70 p-4 transition hover:border-primary/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-text">{list.summary.title}</h3>
                          {list.summary.description ? (
                            <p className="mt-1 text-xs text-text-muted">
                              {list.summary.description}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-text-muted">
                            {list.summary.items_count} juego{list.summary.items_count === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleList(list)}
                            disabled={list.isSaving}
                            className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-text transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {list.containsGame ? "Quitar" : "Agregar"}
                          </button>
                          {list.summary.is_public ? (
                            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
                              Publica
                            </span>
                          ) : (
                            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
                              Privada
                            </span>
                          )}
                        </div>
                      </div>
                      {list.error ? (
                        <p className="mt-2 text-xs text-danger">{list.error}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted">
                  Aun no tenes listas propias. <a href="/lists/new" className="text-primary underline-offset-4 hover:underline">Crea una nueva lista</a>
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
