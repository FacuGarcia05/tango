"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchBacklog, removeFromBacklog } from "@/lib/backlog";
import type { BacklogEntry } from "@/types";

interface BacklogState {
  items: BacklogEntry[];
  loading: boolean;
  error: string | null;
}

export default function BacklogPage() {
  const [state, setState] = useState<BacklogState>({
    items: [],
    loading: true,
    error: null,
  });

  const loadBacklog = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetchBacklog();
      setState({ items: response.items, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || "No se pudo cargar tu backlog"
          : "No se pudo cargar tu backlog";
      setState({ items: [], loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    void loadBacklog();
  }, [loadBacklog]);

  const handleRemove = useCallback(
    async (entry: BacklogEntry) => {
      try {
        await removeFromBacklog(entry.game.slug);
        setState((prev) => {
          const remaining = prev.items.filter((item) => item.id !== entry.id);
          return { ...prev, items: remaining };
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message || "No se pudo quitar el juego del backlog"
            : "No se pudo quitar el juego del backlog";
        setState((prev) => ({ ...prev, error: message }));
      }
    },
    [],
  );

  const { items, loading, error } = state;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Backlog</p>
        <h1 className="text-3xl font-bold tracking-tight text-text">Mis juegos pendientes</h1>
        <p className="text-sm text-text-muted">
          Agrega o quita juegos desde la ficha de cada titulo. El backlog es privado y unico por usuario.
        </p>
      </header>

      {loading ? (
        <div className="rounded-3xl border border-border bg-surface/80 p-6 shadow">
          <p className="text-sm text-text-muted">Cargando backlog...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-danger/40 bg-danger/10 p-6 text-sm text-danger">
          {error}
        </div>
      ) : (
        <section className="space-y-4 rounded-3xl border border-border bg-surface/80 p-6 shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-text">Backlog</h2>
              <p className="text-xs text-text-muted">
                {items.length} juego{items.length === 1 ? "" : "s"}
              </p>
            </div>
            <Link
              href="/games"
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary"
            >
              Buscar juegos
            </Link>
          </div>

          {items.length ? (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-background/60 p-4 shadow-sm"
                >
                  <Image
                    src={item.game.cover_url ?? "/placeholder-cover.svg"}
                    alt={item.game.title}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg border border-border object-cover"
                  />
                  <div className="flex-1">
                    <Link
                      href={`/games/${item.game.slug}`}
                      className="text-sm font-semibold text-text transition hover:text-primary"
                    >
                      {item.game.title}
                    </Link>
                    <p className="text-xs text-text-muted">
                      Agregado el{" "}
                      {new Date(item.created_at ?? Date.now()).toLocaleDateString("es-AR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="rounded-md border border-danger/50 bg-danger/10 px-3 py-1 text-xs font-semibold uppercase text-danger transition hover:border-danger hover:bg-danger/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">
              Tu backlog esta vacio. Suma juegos desde la ficha de cada titulo con el boton "Agregar al backlog".
            </p>
          )}
        </section>
      )}
    </main>
  );
}

