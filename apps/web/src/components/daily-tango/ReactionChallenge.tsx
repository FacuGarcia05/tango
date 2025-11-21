"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";
import type { DailyTangoChallenge, DailyTangoReactionConfig, DailyTangoAttempt } from "@/types";

interface ReactionChallengeProps {
  challenge: DailyTangoChallenge & { config: DailyTangoReactionConfig };
}

interface ReactionResponse {
  attempt: DailyTangoAttempt;
  duration_ms: number;
}

type ReactionState = "idle" | "waiting" | "ready" | "cooldown";

export function ReactionChallenge({ challenge }: ReactionChallengeProps) {
  const router = useRouter();
  const initialAttempt = challenge.attempts[0];
  const [state, setState] = useState<ReactionState>(challenge.completed ? "cooldown" : "idle");
  const [message, setMessage] = useState<string | null>(
    challenge.completed && initialAttempt?.duration_ms
      ? `Tu tiempo: ${initialAttempt.duration_ms} ms`
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(initialAttempt?.duration_ms ?? null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const readyAtRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const schedule = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const delay =
      Math.floor(
        Math.random() * (challenge.config.maxDelayMs - challenge.config.minDelayMs),
      ) + challenge.config.minDelayMs;

    timerRef.current = setTimeout(() => {
      readyAtRef.current = performance.now();
      setState("ready");
      setMessage("¡Click ahora!");
    }, delay);
  };

  const start = () => {
    if (challenge.completed) return;
    setError(null);
    setMessage("Preparate...");
    setState("waiting");
    readyAtRef.current = null;
    schedule();
  };

  const recordAttempt = async (reactionMs: number) => {
    setState("cooldown");
    setDuration(reactionMs);
    setMessage(`Tu tiempo: ${reactionMs} ms`);
    try {
      await api<ReactionResponse>("/daily-tango/reaction/result", {
        method: "POST",
        body: JSON.stringify({ durationMs: reactionMs }),
      });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No pudimos guardar el resultado");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No pudimos guardar el resultado");
      }
    }
  };

  const handleClick = () => {
    if (challenge.completed || state === "cooldown") {
      return;
    }

    if (state === "idle") {
      start();
      return;
    }

    if (state === "waiting") {
      setMessage("Muy rapido, espera el cambio de color.");
      setError(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setState("idle");
      return;
    }

    if (state === "ready" && readyAtRef.current) {
      const reactionMs = Math.max(1, Math.round(performance.now() - readyAtRef.current));
      readyAtRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      recordAttempt(reactionMs);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-surface/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text">Reaccion rapida</h3>
          <p className="text-xs text-text-muted">Haz click cuando el boton se ilumine.</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          Racha {challenge.streak}
        </span>
      </div>

      <button
        type="button"
        onClick={handleClick}
        className={`flex h-32 w-full items-center justify-center rounded-3xl text-lg font-semibold text-primary-contrast transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          state === "ready"
            ? "bg-success"
            : state === "waiting"
              ? "bg-warning text-bg"
              : "bg-primary"
        }`}
        disabled={challenge.completed}
      >
        {challenge.completed ? "Resultado guardado" : state === "ready" ? "¡Click!" : "Comenzar"}
      </button>

      {message ? <p className="text-sm text-text">{message}</p> : null}
      {duration ? (
        <p className="text-xs text-text-muted">
          Ultimo tiempo: <span className="font-semibold text-text">{duration} ms</span>
        </p>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
