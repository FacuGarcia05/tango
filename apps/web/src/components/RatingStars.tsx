"use client";

import { useCallback, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { RatingMutationResponse } from "@/types";

interface RatingStarsProps {
  slug: string;
  initialValue: number | null;
  disabled?: boolean;
  onUpdated?: (payload: RatingMutationResponse) => void;
}

const STARS = [1, 2, 3, 4, 5];

export function RatingStars({ slug, initialValue, disabled, onUpdated }: RatingStarsProps) {
  const [value, setValue] = useState<number>(initialValue ?? 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayValue = hovered ?? value;

  const handleSubmit = useCallback(
    async (nextValue: number) => {
      if (disabled || loading) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await api<RatingMutationResponse>(`/games/${slug}/ratings`, {
          method: "PUT",
          body: JSON.stringify({ value: nextValue }),
        });
        setValue(payload.value);
        onUpdated?.(payload);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message || "No se pudo actualizar tu calificacion"
            : "No se pudo actualizar tu calificacion";
        setError(message);
      } finally {
        setLoading(false);
        setHovered(null);
      }
    },
    [disabled, loading, onUpdated, slug]
  );

  const handleClear = useCallback(() => handleSubmit(0), [handleSubmit]);

  const label = useMemo(() => {
    if (displayValue <= 0) return "Sin calificacion";
    return `${displayValue} / 5`;
  }, [displayValue]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {STARS.map((star) => {
            const active = displayValue >= star;
            return (
              <button
                key={star}
                type="button"
                className={`h-8 w-8 rounded-full border border-transparent p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  active ? "text-primary" : "text-text-muted"
                } ${disabled ? "cursor-not-allowed opacity-50" : "hover:text-primary"}`}
                disabled={disabled || loading}
                aria-label={`Calificar con ${star} estrellas`}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSubmit(star)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </button>
            );
          })}
        </div>
        <span className="text-sm font-semibold text-text">{label}</span>
        {value > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || loading}
            className="text-xs font-semibold text-text-muted transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-50"
          >
            Quitar
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
