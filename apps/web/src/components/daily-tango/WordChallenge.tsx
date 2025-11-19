"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { DailyTangoChallenge, DailyTangoWordConfig, DailyTangoAttempt } from "@/types";

interface WordChallengeProps {
  challenge: DailyTangoChallenge & { config: DailyTangoWordConfig };
}

interface GuessResponse {
  attempt: DailyTangoAttempt;
  feedback: ("correct" | "present" | "miss")[];
  won: boolean;
  remaining_attempts: number;
  solution?: string | null;
  completed: boolean;
}

function extractFeedback(attempt: DailyTangoAttempt) {
  if (!attempt.payload || typeof attempt.payload !== "object") return [];
  const payload = attempt.payload as { feedback?: ("correct" | "present" | "miss")[] };
  return Array.isArray(payload.feedback) ? payload.feedback : [];
}

function extractGuess(attempt: DailyTangoAttempt) {
  if (!attempt.payload || typeof attempt.payload !== "object") return "";
  const payload = attempt.payload as { guess?: string };
  return payload.guess ?? "";
}

export function WordChallenge({ challenge }: WordChallengeProps) {
  const router = useRouter();
  const [attempts, setAttempts] = useState<DailyTangoAttempt[]>(challenge.attempts);
  const [completed, setCompleted] = useState(challenge.completed);
  const [solution, setSolution] = useState(challenge.solution ?? null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rows = useMemo(() => {
    const filled = attempts.map((attempt) => ({
      letters: extractGuess(attempt).padEnd(challenge.config.length).split("").slice(0, challenge.config.length),
      feedback: extractFeedback(attempt),
    }));
    const emptyRows = Math.max(0, challenge.max_attempts - filled.length);
    return [
      ...filled,
      ...Array.from({ length: emptyRows }, () => ({
        letters: Array.from({ length: challenge.config.length }, () => ""),
        feedback: [],
      })),
    ];
  }, [attempts, challenge.config.length, challenge.max_attempts]);

  const handleSubmit = async () => {
    if (completed || loading) return;

    const normalized = currentGuess.trim().toUpperCase();
    if (normalized.length !== challenge.config.length) {
      setError(`La palabra tiene ${challenge.config.length} letras`);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await api<GuessResponse>("/daily-tango/word/guess", {
        method: "POST",
        body: JSON.stringify({ guess: normalized }),
      });
      setAttempts((prev) => [...prev, response.attempt]);
      setCurrentGuess("");
      if (response.solution) {
        setSolution(response.solution);
      }
      if (response.completed) {
        setCompleted(true);
        router.refresh();
      }
      setMessage(response.won ? "¡Adivinaste la palabra!" : response.remaining_attempts === 0 ? "Sin intentos. Vuelve mañana." : null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No pudimos registrar el intento");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No pudimos registrar el intento");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-3xl border border-border bg-surface/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text">Palabra del día</h3>
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Pista: <span className="text-text">{challenge.config.hint}</span>
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          Racha {challenge.streak} {challenge.streak === 1 ? "día" : "días"}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-2">
            {row.letters.map((letter, columnIndex) => {
              const cellState = row.feedback[columnIndex] ?? "empty";
              const baseClasses = "flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-bold uppercase transition";
              const styles =
                cellState === "correct"
                  ? "border-success/80 bg-success/20 text-success"
                  : cellState === "present"
                    ? "border-warning/80 bg-warning/20 text-warning"
                    : letter
                      ? "border-border bg-bg"
                      : "border-border/80 bg-transparent text-text-muted";
              return (
                <div key={`cell-${rowIndex}-${columnIndex}`} className={`${baseClasses} ${styles}`}>
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={currentGuess}
          onChange={(event) => setCurrentGuess(event.target.value.toUpperCase())}
          maxLength={challenge.config.length}
          placeholder="Intento"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={completed || loading}
        />
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={completed || loading}
        >
          {completed ? "Desafio listo" : loading ? "Enviando..." : "Probar"}
        </button>
        {message ? <p className="text-xs text-success">{message}</p> : null}
        {completed && solution ? (
          <p className="text-xs text-text-muted">
            Palabra: <span className="font-semibold text-text">{solution}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
