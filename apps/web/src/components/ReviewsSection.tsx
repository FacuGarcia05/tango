"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { PaginatedReviews, Review, ReviewStats, User } from "@/types";
import { ReviewItem } from "./ReviewItem";
import { ReviewModal } from "./ReviewModal";

interface ReviewsSectionProps {
  slug: string;
  gameId: string;
  reviewCount: number;
  currentUser: User | null;
}

const PAGE_SIZE = 10;

export function ReviewsSection({ slug, gameId, reviewCount, currentUser }: ReviewsSectionProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(reviewCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserReview, setHasUserReview] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    setTotal(reviewCount);
  }, [reviewCount]);

  useEffect(() => {
    if (!currentUser) {
      setHasUserReview(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await api<{ hasReview: boolean }>(`/reviews/me/${gameId}/exists`, {
          signal: controller.signal,
        });
        if (!cancelled) {
          setHasUserReview(response.hasReview);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setHasUserReview(false);
        } else if (!(err instanceof ApiError && err.status === 404)) {
          console.warn("No se pudo verificar si el usuario tiene resenas", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentUser?.id, gameId, refreshNonce]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      const skip = (page - 1) * PAGE_SIZE;
      try {
        const response = await api<PaginatedReviews>(`/games/${slug}/reviews?take=${PAGE_SIZE}&skip=${skip}`);
        if (!cancelled) {
          setReviews(response.items);
          setTotal(response.total);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message || "No se pudieron cargar las resenas" : "No se pudieron cargar las resenas";
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, page, slug, refreshNonce]);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        setPage(1);
      }
      return next;
    });
  };

  const canPrev = page > 1;
  const canNext = useMemo(() => page * PAGE_SIZE < total, [page, total]);

  const handleModalSuccess = useCallback(
    (review: Review) => {
      setModalOpen(false);
      setHasUserReview(true);
      setRefreshNonce((value) => value + 1);
      setTotal((value) => value + 1);
      if (open && page === 1) {
        setReviews((prev) => [review, ...prev].slice(0, PAGE_SIZE));
      }
    },
    [open, page]
  );

  const handleStatsChange = useCallback(
    (reviewId: string, stats: ReviewStats & { likedByMe: boolean }) => {
      setReviews((prev) =>
        prev.map((item) =>
          item.id === reviewId
            ? {
                ...item,
                stats: {
                  likes_count: stats.likes_count,
                  comments_count: stats.comments_count,
                },
                likedByMe: stats.likedByMe,
              }
            : item
        )
      );
    },
    []
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">Resenas</h2>
        <div className="flex items-center gap-3">
          {currentUser && !hasUserReview ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Escribir resena
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleOpen}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {open ? "Ocultar resenas" : `Ver resenas (${total})`}
          </button>
        </div>
      </div>

      {open ? (
        <div className="space-y-6">
          {loading ? <p className="text-sm text-text-muted">Cargando resenas...</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          {!loading && !error && total === 0 ? (
            <p className="text-sm text-text-muted">Aun no hay resenas</p>
          ) : null}

          {!loading && !error && reviews.length > 0 ? (
            <ul className="space-y-4">
              {reviews.map((review) => (
                <li key={review.id}>
                  <ReviewItem review={review} currentUser={currentUser} onStatsChange={handleStatsChange} />
                </li>
              ))}
            </ul>
          ) : null}

          {open && total > PAGE_SIZE ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!canPrev || loading}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-text-muted">Pagina {page}</span>
              <button
                type="button"
                onClick={() => canNext && setPage((prev) => prev + 1)}
                disabled={!canNext || loading}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <ReviewModal open={modalOpen} gameId={gameId} onClose={() => setModalOpen(false)} onCreated={handleModalSuccess} />
    </section>
  );
}
