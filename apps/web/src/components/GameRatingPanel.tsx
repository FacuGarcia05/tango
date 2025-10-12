"use client";

import { useState } from "react";

import type { GameStats, RatingMutationResponse, User } from "@/types";
import { RatingStars } from "./RatingStars";

interface GameRatingPanelProps {
  slug: string;
  stats: GameStats | null | undefined;
  initialValue: number | null;
  currentUser: User | null;
}

export function GameRatingPanel({ slug, stats, initialValue, currentUser }: GameRatingPanelProps) {
  const [ratingAvg, setRatingAvg] = useState(stats?.rating_avg ?? null);
  const [ratingCount, setRatingCount] = useState(stats?.rating_count ?? 0);
  const [value, setValue] = useState(initialValue ?? 0);

  const handleUpdated = (payload: RatingMutationResponse) => {
    setRatingAvg(payload.rating_avg);
    setRatingCount(payload.rating_count);
    setValue(payload.value);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted">Promedio de la comunidad</p>
          <p className="text-2xl font-bold text-text">
            {ratingAvg !== null ? ratingAvg.toFixed(1) : "—"} <span className="text-sm font-medium text-text-muted">({ratingCount})</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-text-muted">Mi calificacion</p>
          <p className="text-xl font-semibold text-text">{value > 0 ? `${value}/5` : "Sin nota"}</p>
        </div>
      </div>
      {currentUser ? (
        <RatingStars slug={slug} initialValue={initialValue} onUpdated={handleUpdated} />
      ) : (
        <p className="text-xs text-text-muted">Inicia sesion para calificar este juego.</p>
      )}
    </div>
  );
}
