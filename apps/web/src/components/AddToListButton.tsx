/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  addItemToList,
  fetchListBySlug,
  fetchMyLists,
  removeItemFromList,
  toggleBacklog,
} from "@/lib/lists";
import type { ListItemGame, ListSummary } from "@/types";

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

  const backlog = useMemo(() => lists.find((list) => list.summary.is_backlog) ?? null, [lists]);
  const regularLists = useMemo(
    () => lists.filter((list) => !list.summary.is_backlog),
    [lists],
  );

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

  const updateListState = useCallback((slug: string, updater: (prev: ListState) => ListState) => {
    setLists((prev) =>
      prev.map((entry) => (entry.summary.slug === slug ? updater(entry) : entry)),
    );
  }, []);

  const handleToggleBacklog = useCallback(async () => {
    if (!backlog) {
      return;
    }

    updateListState(backlog.summary.slug, (current) => ({ ...current, isSaving: true, error: null }));
    try {
      const result = await toggleBacklog(game.slug);
      updateListState(backlog.summary.slug, (current) => ({
        ...current,
        isSaving: false,
        containsGame: result.inBacklog,
      }));
    } catch (mutationError) {
      console.error("Failed to toggle backlog", mutationError);
      updateListState(backlog.summary.slug, (current) => ({
        ...current,
        isSaving: false,
        error:
          mutationError instanceof ApiError
            ? mutationError.message ?? "No se pudo actualizar el backlog"
            : "No se pudo actualizar el backlog",
      }));
    }
  }, [backlog, game.slug, updateListState]);

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
              {loading ? (
                <p className="text-sm text-text-muted">Cargando tus listas...</p>
              ) : null}
              {error ? (
                <p className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              ) : null}

              {backlog ? (
                <div className="rounded-2xl border border-border bg-surface/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Backlog
                      </p>
                      <h3 className="text-base font-semibold text-text">
                        {backlog.summary.title || "Backlog"}
                      </h3>
                      <p className="text-xs text-text-muted">
                        {backlog.summary.items_count} juegos pendientes
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleBacklog}
                      disabled={backlog.isSaving}
                      className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-text transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {backlog.containsGame ? "Quitar" : "Agregar"}
                    </button>
                  </div>
                  {backlog.error ? (
                    <p className="mt-2 text-xs text-danger">{backlog.error}</p>
                  ) : null}
                </div>
              ) : null}

              {regularLists.length ? (
                <ul className="space-y-3">
                  {regularLists.map((list) => (
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
                            {list.summary.items_count} juegos
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
              ) : null}

              {!loading && !regularLists.length && !backlog ? (
                <p className="text-sm text-text-muted">
                  Aun no tenes listas propias.{" "}
                  <a href="/lists/new" className="text-primary underline-offset-4 hover:underline">
                    Creá una nueva lista
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
