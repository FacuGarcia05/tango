"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { addToBacklog, checkBacklog, removeFromBacklog } from "@/lib/backlog";
import type { ListItemGame } from "@/types";

interface AddToBacklogButtonProps {
  game: ListItemGame;
}

interface BacklogButtonState {
  loading: boolean;
  inBacklog: boolean;
  error: string | null;
}

export function AddToBacklogButton({ game }: AddToBacklogButtonProps) {
  const [state, setState] = useState<BacklogButtonState>({
    loading: true,
    inBacklog: false,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const result = await checkBacklog(game.slug);
        if (!active) return;
        setState({ loading: false, inBacklog: result.inBacklog, error: null });
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof ApiError
            ? err.message || "No se pudo verificar el backlog"
            : "No se pudo verificar el backlog";
        setState({ loading: false, inBacklog: false, error: message });
      }
    };

    void loadStatus();

    return () => {
      active = false;
    };
  }, [game.slug]);

  const toggle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      if (state.inBacklog) {
        await removeFromBacklog(game.slug);
        setState({ loading: false, inBacklog: false, error: null });
      } else {
        await addToBacklog(game.slug);
        setState({ loading: false, inBacklog: true, error: null });
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || "No se pudo actualizar el backlog"
          : "No se pudo actualizar el backlog";
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [game.slug, state.inBacklog]);

  const { loading, inBacklog, error } = state;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Actualizando..." : inBacklog ? "Quitar del backlog" : "Agregar al backlog"}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

