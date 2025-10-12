"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { FollowStats } from "@/types";

interface FollowButtonProps {
  targetUserId: string;
  initialStats: FollowStats;
  disabled?: boolean;
  onChange?: (stats: FollowStats) => void;
}

export function FollowButton({ targetUserId, initialStats, disabled, onChange }: FollowButtonProps) {
  const [stats, setStats] = useState<FollowStats>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  const handleToggle = useCallback(async () => {
    if (disabled || loading) return;

    setLoading(true);
    setError(null);

    try {
      const method = stats.isFollowing ? "DELETE" : "POST";
      const next = await api<FollowStats>(`/users/${targetUserId}/follow`, { method });
      setStats(next);
      onChange?.(next);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || "No se pudo actualizar el seguimiento"
          : "No se pudo actualizar el seguimiento";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [disabled, loading, onChange, stats.isFollowing, targetUserId]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || loading}
        className={`rounded-full px-4 py-2 text-sm font-semibold shadow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          stats.isFollowing
            ? "bg-border text-text hover:bg-border/70"
            : "bg-primary text-primary-contrast hover:opacity-90"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {loading ? "Actualizando..." : stats.isFollowing ? "Siguiendo" : "Seguir"}
      </button>
      <div className="flex gap-4 text-xs text-text-muted">
        <div className="flex flex-col">
          <span className="font-semibold text-text">{stats.followers}</span>
          <span>Followers</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-text">{stats.following}</span>
          <span>Following</span>
        </div>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
