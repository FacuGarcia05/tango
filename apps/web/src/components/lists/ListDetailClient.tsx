"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { ApiError } from "@/lib/api";
import { removeItemFromList, reorderListItems, updateList } from "@/lib/lists";
import type { ListDetail, ListItem } from "@/types";

interface ListDetailClientProps {
  initialList: ListDetail;
  isOwner: boolean;
  shareUrl: string;
}

function formatTimestamp(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ListDetailClient({ initialList, isOwner, shareUrl }: ListDetailClientProps) {
  const [title, setTitle] = useState(initialList.title);
  const [description, setDescription] = useState(initialList.description ?? "");
  const [isPublic, setIsPublic] = useState(initialList.is_public);
  const [items, setItems] = useState<ListItem[]>(initialList.items ?? []);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const lastUpdated = useMemo(() => formatTimestamp(initialList.updated_at), [initialList]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMetaError(null);
    } catch (error) {
      console.error("Failed to copy share link", error);
      setMetaError("No se pudo copiar el enlace. Copialo manualmente.");
    }
  }, [shareUrl]);

  const handleSaveMeta = useCallback(async () => {
    setSavingMeta(true);
    setMetaError(null);
    try {
      const updated = await updateList(initialList.slug, {
        title: title.trim() || initialList.title,
        description: description.trim() || "",
        isPublic,
      });
      setTitle(updated.title);
      setDescription(updated.description ?? "");
      setIsPublic(updated.is_public);
    } catch (mutationError) {
      console.error("Failed to update list metadata", mutationError);
      setMetaError(
        mutationError instanceof ApiError
          ? mutationError.message ?? "No se pudo actualizar la lista"
          : "No se pudo actualizar la lista",
      );
    } finally {
      setSavingMeta(false);
    }
  }, [description, initialList.slug, initialList.title, isPublic, title]);

  const handleToggleVisibility = useCallback(async () => {
    if (!isOwner) return;
    setSavingMeta(true);
    setMetaError(null);
    try {
      const updated = await updateList(initialList.slug, { isPublic: !isPublic });
      setIsPublic(updated.is_public);
    } catch (mutationError) {
      console.error("Failed to toggle visibility", mutationError);
      setMetaError(
        mutationError instanceof ApiError
          ? mutationError.message ?? "No se pudo actualizar la visibilidad"
          : "No se pudo actualizar la visibilidad",
      );
    } finally {
      setSavingMeta(false);
    }
  }, [initialList.slug, isOwner, isPublic]);

  const handleRemoveItem = useCallback(
    async (gameSlug: string) => {
      setListError(null);
      try {
        await removeItemFromList(initialList.slug, gameSlug);
        setItems((prev) => prev.filter((item) => item.game.slug !== gameSlug));
      } catch (mutationError) {
        console.error("Failed to remove list item", mutationError);
        setListError(
          mutationError instanceof ApiError
            ? mutationError.message ?? "No se pudo quitar el juego"
            : "No se pudo quitar el juego",
        );
      }
    },
    [initialList.slug],
  );

  const persistReorder = useCallback(
    async (nextItems: ListItem[]) => {
      setListError(null);
      try {
        await reorderListItems(
          initialList.slug,
          nextItems.map((item, index) => ({ gameId: item.game.id, position: index + 1 })),
        );
      } catch (mutationError) {
        console.error("Failed to reorder list", mutationError);
        setListError(
          mutationError instanceof ApiError
            ? mutationError.message ?? "No se pudo actualizar el orden"
            : "No se pudo actualizar el orden",
        );
      }
    },
    [initialList.slug],
  );

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragEnter = useCallback(
    (index: number) => {
      if (dragIndex === null || dragIndex === index) return;
      setItems((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(index, 0, moved);
        return updated.map((item, idx) => ({ ...item, position: idx + 1 }));
      });
      setDragIndex(index);
    },
    [dragIndex],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setItems((prev) => {
      const normalized = prev.map((item, index) => ({ ...item, position: index + 1 }));
      void persistReorder(normalized);
      return normalized;
    });
  }, [persistReorder]);

  const handleKeyReorder = useCallback(
    (index: number, direction: -1 | 1) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= items.length) return;
      setItems((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(index, 1);
        updated.splice(targetIndex, 0, moved);
        const normalized = updated.map((item, idx) => ({ ...item, position: idx + 1 }));
        void persistReorder(normalized);
        return normalized;
      });
    },
    [items.length, persistReorder],
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-surface/80 p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-4">
            {isOwner ? (
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-2xl font-bold text-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Describe el objetivo de esta lista..."
                />
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span>{items.length} juegos</span>
                  {lastUpdated ? <span>Actualizado {lastUpdated}</span> : null}
                  <label className="flex items-center gap-2 text-xs text-text">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(event) => setIsPublic(event.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    Lista publica
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    disabled={savingMeta}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold uppercase text-primary-contrast shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleVisibility}
                    disabled={savingMeta}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPublic ? "Hacer privada" : "Publicar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary"
                  >
                    Compartir
                  </button>
                </div>
                {metaError ? (
                  <p className="text-sm text-danger">{metaError}</p>
                ) : (
                  <p className="text-xs text-text-muted">
                    Compartir: <code className="select-all text-xs text-primary">{shareUrl}</code>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-text">{initialList.title}</h1>
                {initialList.description ? (
                  <p className="text-sm text-text-muted">{initialList.description}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                  <span>{items.length} juegos</span>
                  {lastUpdated ? <span>Actualizado {lastUpdated}</span> : null}
                  <span>{initialList.is_public ? "Lista publica" : "Lista privada"}</span>
                  <span>
                    Por{" "}
                    <Link href={`/users/${initialList.owner.id}`} className="text-primary underline-offset-4 hover:underline">
                      {initialList.owner.display_name}
                    </Link>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary"
                >
                  Compartir
                </button>
                {metaError ? <p className="text-sm text-danger">{metaError}</p> : null}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface/80 p-6 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-text">Juegos</h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Arrastra para reordenar
          </span>
        </div>

        {listError ? (
          <p className="mt-3 rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
            {listError}
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">
            Aun no hay juegos en esta lista. Visita una ficha y usa el boton "Agregar a lista".
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                draggable={isOwner}
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragOver={(event) => event.preventDefault()}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 rounded-2xl border border-border bg-background/60 p-3 shadow-sm transition ${
                  dragIndex === index ? "border-primary shadow-md" : "hover:border-primary/60"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-text-muted">
                  #{item.position}
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-surface">
                    <Image
                      src={item.game.cover_url ?? "/placeholder-cover.svg"}
                      alt={item.game.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <Link
                      href={`/games/${item.game.slug}`}
                      className="text-sm font-semibold text-text transition hover:text-primary"
                    >
                      {item.game.title}
                    </Link>
                    {item.note ? <p className="text-xs text-text-muted">{item.note}</p> : null}
                  </div>
                </div>
                {isOwner ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleKeyReorder(index, -1)}
                      className="rounded-full border border-border px-2 py-1 text-xs text-text transition hover:border-primary hover:text-primary"
                    >
                      Arriba
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeyReorder(index, 1)}
                      className="rounded-full border border-border px-2 py-1 text-xs text-text transition hover:border-primary hover:text-primary"
                    >
                      Abajo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.game.slug)}
                      className="rounded-full border border-danger/50 bg-danger/10 px-3 py-1 text-xs font-semibold uppercase text-danger transition hover:border-danger hover:bg-danger/20"
                    >
                      Quitar
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
