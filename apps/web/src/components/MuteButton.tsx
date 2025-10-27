"use client";

import { useCallback, useState } from "react";

import { ApiError } from "@/lib/api";
import { muteUser, unmuteUser } from "@/lib/feed";

interface MuteButtonProps {
  userId: string;
  initialMuted?: boolean;
  minutes?: number;
}

export function MuteButton({ userId, initialMuted = false, minutes }: MuteButtonProps) {
  const [muted, setMuted] = useState(initialMuted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (muted) {
        await unmuteUser(userId);
        setMuted(false);
      } else {
        await muteUser(userId, minutes);
        setMuted(true);
      }
    } catch (mutationError) {
      console.error("Failed to toggle mute", mutationError);
      setError(
        mutationError instanceof ApiError
          ? mutationError.message ?? "No se pudo actualizar el mute"
          : "No se pudo actualizar el mute",
      );
    } finally {
      setLoading(false);
    }
  }, [muted, userId, minutes]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          muted
            ? "border-border bg-surface/80 text-text-muted"
            : "border-border text-text hover:border-primary hover:text-primary"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {muted ? "Quitar silencio" : "Silenciar"}
      </button>
      {error ? <p className="text-[11px] text-danger">{error}</p> : null}
    </div>
  );
}
