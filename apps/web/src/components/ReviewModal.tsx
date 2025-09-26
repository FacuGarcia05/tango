"use client";

import { FormEvent, useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { Review } from "@/types";

interface ReviewModalProps {
  open: boolean;
  gameId: string;
  onClose: () => void;
  onCreated: (review: Review) => void;
}

export function ReviewModal({ open, gameId, onClose, onCreated }: ReviewModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hasSpoilers, setHasSpoilers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
      setHasSpoilers(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedBody = body.trim();
    if (trimmedBody.length < 10) {
      setError("La resena debe tener al menos 10 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        gameId,
        title: title.trim() ? title.trim() : undefined,
        body: trimmedBody,
        hasSpoilers,
      };
      const review = await api<Review>("/reviews", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onCreated(review);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No se pudo guardar la resena");
      } else {
        setError("No se pudo guardar la resena");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text">Escribir resena</h3>
            <p className="text-sm text-text-muted">Comparti tu opinion con la comunidad Tango.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-text-muted transition hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Cerrar modal"
            disabled={submitting}
          >
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="review-title" className="block text-sm font-medium text-text">
              Titulo (opcional)
            </label>
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              placeholder="Mi experiencia"
              maxLength={120}
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="review-body" className="block text-sm font-medium text-text">
              Resena
            </label>
            <textarea
              id="review-body"
              required
              minLength={10}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="mt-1 h-40 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              placeholder="Contanos que te parecio..."
              disabled={submitting}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={hasSpoilers}
              onChange={(event) => setHasSpoilers(event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/60"
              disabled={submitting}
            />
            Contiene spoilers
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Guardando..." : "Publicar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}