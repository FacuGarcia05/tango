"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, api } from "@/lib/api";
import type {
  DailyTangoChallenge,
  DailyTangoMemoryCard,
  DailyTangoMemoryConfig,
  DailyTangoAttempt,
} from "@/types";

interface MemoryChallengeProps {
  challenge: DailyTangoChallenge & { config: DailyTangoMemoryConfig };
}

type CardState = DailyTangoMemoryCard & {
  instance: number;
  pairId: number;
  flipped: boolean;
  matched: boolean;
};

const PAIRS_LIMIT = 6;

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(cards: DailyTangoMemoryCard[], completed: boolean): CardState[] {
  const pool = cards.slice(0, PAIRS_LIMIT);
  const duplicated = pool.flatMap((card, index) => [
    {
      ...card,
      instance: 1,
      pairId: index,
      flipped: completed,
      matched: completed,
    },
    {
      ...card,
      instance: 2,
      pairId: index,
      flipped: completed,
      matched: completed,
    },
  ]);
  return shuffle(duplicated);
}

function parseResult(attempt?: DailyTangoAttempt | undefined) {
  if (!attempt?.payload || typeof attempt.payload !== "object") return null;
  const payload = attempt.payload as { moves?: number; mistakes?: number; durationMs?: number };
  return {
    moves: payload.moves ?? 0,
    mistakes: payload.mistakes ?? 0,
    durationMs: payload.durationMs ?? null,
  };
}

export function MemoryChallenge({ challenge }: MemoryChallengeProps) {
  const router = useRouter();
  const previousResult = parseResult(challenge.attempts[0]);
  const [board, setBoard] = useState<CardState[]>(() => buildDeck(challenge.config.cards, challenge.completed));
  const [selection, setSelection] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(
    challenge.completed && previousResult ? "Resultado registrado" : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(challenge.completed);
  const [result, setResult] = useState(previousResult);
  const startTimeRef = useRef<number | null>(previousResult ? null : Date.now());
  const movesRef = useRef(previousResult?.moves ?? 0);
  const mistakesRef = useRef(previousResult?.mistakes ?? 0);

  useEffect(() => {
    const id = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(id);
  }, [message]);

  const displayStats = useMemo(() => {
    const duration = result?.durationMs
      ? `${Math.round(result.durationMs / 100) / 10}s`
      : completed
        ? "Listo"
        : "-";
    return {
      moves: movesRef.current,
      mistakes: mistakesRef.current,
      duration,
    };
  }, [completed, result]);

  const handleCardClick = (index: number) => {
    if (completed || busy || submitting) return;
    if (board[index].flipped || board[index].matched) return;

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const nextBoard = board.map((card, idx) =>
      idx === index ? { ...card, flipped: true } : card,
    );
    const nextSelection = [...selection, index];

    setBoard(nextBoard);
    setSelection(nextSelection);

    if (nextSelection.length === 2) {
      resolveSelection(nextBoard, nextSelection);
    }
  };

  const resolveSelection = (currentBoard: CardState[], selected: number[]) => {
    setBusy(true);
    movesRef.current += 1;

    const [firstIndex, secondIndex] = selected;
    const first = currentBoard[firstIndex];
    const second = currentBoard[secondIndex];

    if (first.pairId === second.pairId) {
      const updated = currentBoard.map((card, idx) =>
        idx === firstIndex || idx === secondIndex ? { ...card, matched: true } : card,
      );
      setBoard(updated);
      setSelection([]);
      setBusy(false);

      if (updated.every((card) => card.matched)) {
        finalizeGame(updated);
      }
    } else {
      mistakesRef.current += 1;
      setTimeout(() => {
        setBoard((prev) =>
          prev.map((card, idx) =>
            idx === firstIndex || idx === secondIndex ? { ...card, flipped: false } : card,
          ),
        );
        setSelection([]);
        setBusy(false);
      }, 900);
    }
  };

  const finalizeGame = async (currentBoard: CardState[]) => {
    if (completed) return;

    setSubmitting(true);
    setError(null);

    const durationMs = startTimeRef.current
      ? Math.max(1, Date.now() - startTimeRef.current)
      : 1;

    try {
      const response = await api<{
        attempt: DailyTangoAttempt;
        score: number;
        duration_ms: number;
      }>("/daily-tango/memory/result", {
        method: "POST",
        body: JSON.stringify({
          moves: movesRef.current,
          mistakes: mistakesRef.current,
          durationMs,
        }),
      });
      setCompleted(true);
      setResult({
        moves: movesRef.current,
        mistakes: mistakesRef.current,
        durationMs: response.duration_ms,
      });
      setMessage("¡Memoria completada!");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No pudimos guardar el resultado");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No pudimos guardar el resultado");
      }
      // revert board so jugador pueda intentar otra vez
      setBoard(buildDeck(challenge.config.cards, false));
      movesRef.current = 0;
      mistakesRef.current = 0;
      startTimeRef.current = Date.now();
      setSelection([]);
    } finally {
      setBusy(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-surface/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text">Memory</h3>
          <p className="text-xs uppercase tracking-wide text-text-muted">{challenge.config.title}</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          Racha {challenge.streak}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {board.map((card, index) => (
          <button
            key={`${card.slug}-${card.instance}`}
            type="button"
            onClick={() => handleCardClick(index)}
            disabled={completed || busy || submitting}
            className={`flex h-24 items-center justify-center rounded-2xl border text-center text-xs font-semibold uppercase tracking-wide transition ${
              card.flipped || card.matched
                ? "border-primary/60 bg-primary/10 text-text"
                : "border-border bg-bg/90 text-text-muted hover:border-primary/40"
            }`}
          >
            {card.flipped || card.matched ? (
              <div className="flex flex-col items-center gap-1">
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border/60">
                  <Image src={card.image} alt={card.title} fill className="object-cover" sizes="48px" />
                </div>
                <span className="px-2 text-[10px]">{card.title}</span>
              </div>
            ) : (
              <span>¿?</span>
            )}
          </button>
        ))}
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {message ? <p className="text-xs text-success">{message}</p> : null}

      <div className="rounded-2xl border border-border/60 bg-bg/60 p-3 text-xs text-text-muted">
        <div className="flex flex-wrap gap-4">
          <span>
            Movimientos: <span className="font-semibold text-text">{displayStats.moves}</span>
          </span>
          <span>
            Errores: <span className="font-semibold text-text">{displayStats.mistakes}</span>
          </span>
          <span>
            Tiempo: <span className="font-semibold text-text">{displayStats.duration}</span>
          </span>
        </div>
        {completed ? (
          <p className="mt-2 text-xs text-text-muted">Desafio completado, vuelve mañana.</p>
        ) : (
          <p className="mt-2 text-xs text-text-muted">Encuentra todas las parejas para registrar tu marca.</p>
        )}
      </div>
    </div>
  );
}
