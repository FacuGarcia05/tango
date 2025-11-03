
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { ApiError } from "@/lib/api";
import { deleteList, updateList } from "@/lib/lists";
import type { ListSummary } from "@/types";

interface MyListsManagerProps {
  initialLists: ListSummary[];
}

interface ListEntry extends ListSummary {
  isProcessing?: boolean;
  error?: string | null;
}

export function MyListsManager({ initialLists }: MyListsManagerProps) {
  const [lists, setLists] = useState<ListEntry[]>(() => initialLists);

  const handleToggleVisibility = useCallback(
    async (slug: string) => {
      setLists((prev) =>
        prev.map((list) =>
          list.slug === slug ? { ...list, isProcessing: true, error: null } : list,
        ),
      );

      try {
        const target = lists.find((list) => list.slug === slug);
        if (!target) {
          return;
        }

        const updated = await updateList(slug, { isPublic: !target.is_public });
        setLists((prev) =>
          prev.map((list) =>
            list.slug === slug
              ? {
                  ...list,
                  isProcessing: false,
                  is_public: updated.is_public,
                  updated_at: updated.updated_at,
                }
              : list,
          ),
        );
      } catch (mutationError) {
        console.error("Failed to update list visibility", mutationError);
        setLists((prev) =>
          prev.map((list) =>
            list.slug === slug
              ? {
                  ...list,
                  isProcessing: false,
                  error:
                    mutationError instanceof ApiError
                      ? mutationError.message ?? "No se pudo actualizar la lista"
                      : "No se pudo actualizar la lista",
                }
              : list,
          ),
        );
      }
    },
    [lists],
  );

  const handleDelete = useCallback(
    async (slug: string) => {
      const target = lists.find((list) => list.slug === slug);
      if (!target) {
        return;
      }

      const confirmDelete =
        typeof window !== "undefined" &&
        window.confirm(`Seguro que queres borrar "${target.title}"? Esta accion es permanente.`);

      if (!confirmDelete) {
        return;
      }

      setLists((prev) =>
        prev.map((list) =>
          list.slug === slug ? { ...list, isProcessing: true, error: null } : list,
        ),
      );

      try {
        await deleteList(slug);
        setLists((prev) => prev.filter((list) => list.slug !== slug));
      } catch (mutationError) {
        console.error("Failed to delete list", mutationError);
        setLists((prev) =>
          prev.map((list) =>
            list.slug === slug
              ? {
                  ...list,
                  isProcessing: false,
                  error:
                    mutationError instanceof ApiError
                      ? mutationError.message ?? "No se pudo borrar la lista"
                      : "No se pudo borrar la lista",
                }
              : list,
          ),
        );
      }
    },
    [lists],
  );

  if (!lists.length) {
    return (
      <div className="rounded-3xl border border-border bg-surface/80 p-8 text-center shadow">
        <p className="text-base font-semibold text-text">Aun no tenes listas creadas</p>
        <p className="mt-2 text-sm text-text-muted">
          Crea una coleccion curada para compartir con amistades y usa el backlog desde la ficha de cada juego.
        </p>
        <Link
          href="/lists/new"
          className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast transition hover:opacity-90"
        >
          Crear mi primera lista
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="grid gap-4 md:grid-cols-2">
        {lists.map((list) => (
          <li key={list.id} className="rounded-2xl border border-border bg-surface/80 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-text">{list.title}</h3>
                  {list.is_backlog ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Backlog
                    </span>
                  ) : null}
                </div>
                {list.description ? (
                  <p className="text-sm text-text-muted">{list.description}</p>
                ) : null}
                <p className="text-xs text-text-muted">
                  {list.items_count} juegos - {list.is_public ? "Publica" : "Privada"}
                </p>
              </div>
              <Link
                href={`/lists/${list.slug}`}
                className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary"
              >
                Ver
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={list.isProcessing}
                onClick={() => handleToggleVisibility(list.slug)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {list.is_public ? "Hacer privada" : "Publicar"}
              </button>
              <button
                type="button"
                disabled={list.isProcessing}
                onClick={() => handleDelete(list.slug)}
                className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-xs font-semibold uppercase text-danger transition hover:border-danger hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Borrar
              </button>
              <Link
                href={`/lists/${list.slug}`}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary"
              >
                Editar
              </Link>
            </div>

            {list.error ? <p className="mt-2 text-xs text-danger">{list.error}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
