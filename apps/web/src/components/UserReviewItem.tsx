"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Review } from "@/types";

const FALLBACK_COVER = "/placeholder-cover.svg";
const EXCERPT_LENGTH = 240;

interface UserReviewItemProps {
  review: Review;
}

export function UserReviewItem({ review }: UserReviewItemProps) {
  const [showSpoilers, setShowSpoilers] = useState(!review.has_spoilers);
  const [expanded, setExpanded] = useState(false);

  const createdAt = useMemo(() => {
    try {
      return new Date(review.created_at).toLocaleDateString("es-AR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }, [review.created_at]);

  const game = review.game;
  const cover = game?.cover_url ?? FALLBACK_COVER;
  const body = review.body?.trim() ?? "";
  const shouldTruncate = body.length > EXCERPT_LENGTH;
  const excerpt = expanded || !shouldTruncate ? body : `${body.slice(0, EXCERPT_LENGTH).trimEnd()}…`;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/80 p-5 shadow-sm transition hover:border-primary/50">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-border">
          <Image src={cover} alt={game?.title ?? "Juego"} fill sizes="96px" className="object-cover" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {game ? (
                <Link
                  href={`/games/${game.slug}`}
                  className="text-lg font-semibold text-text transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  {game.title}
                </Link>
              ) : (
                <p className="text-lg font-semibold text-text">Juego eliminado</p>
              )}
              <p className="text-xs uppercase tracking-wide text-text-muted">Publicado el {createdAt}</p>
            </div>
            {review.likes ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-muted">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                >
                  <path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z" />
                </svg>
                {review.likes}
              </span>
            ) : null}
          </div>

          {review.has_spoilers && !showSpoilers ? (
            <div className="rounded-xl border border-amber-400/60 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p className="font-semibold">Esta reseña contiene spoilers.</p>
              <button
                type="button"
                onClick={() => setShowSpoilers(true)}
                className="mt-2 rounded-md border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                Mostrar contenido
              </button>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-text-muted">{excerpt || "Sin contenido"}</p>
          )}

          {!review.has_spoilers && shouldTruncate ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="text-xs font-semibold text-primary transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
