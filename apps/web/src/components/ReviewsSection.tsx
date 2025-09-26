"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { PaginatedReviews, Review, User } from "@/types";
import { ReviewModal } from "@/components/ReviewModal";

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
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});

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
        if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
          setHasUserReview(false);
        } else if (!(err instanceof ApiError && err.status === 403)) {
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
    if (!open) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const skip = (page - 1) * PAGE_SIZE;
        const response = await api<PaginatedReviews>(
          `/games/${slug}/reviews?take=${PAGE_SIZE}&skip=${skip}`,
          { signal: controller.signal },
        );
        if (!cancelled) {
          setReviews(response.items);
          setTotal(response.total);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message || "No se pudieron cargar las resenas");
        } else {
          setError("No se pudieron cargar las resenas");
        }
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

  const handleRevealSpoiler = useCallback((id: string) => {
    setRevealedSpoilers((prev) => ({ ...prev, [id]: true }));
  }, []);

  const handleModalSuccess = useCallback(
    (review: Review) => {
      setModalOpen(false);
      setHasUserReview(true);
      setOpen(true);
      setPage(1);
      setRefreshNonce((value) => value + 1);
      setTotal((value) => value + 1);
      setReviews((prev) => [review, ...prev].slice(0, PAGE_SIZE));
    },
    [],
  );

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleOpenModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text">Resenas</h2>
        <div className="flex items-center gap-3">
          {currentUser && !hasUserReview ? (
            <button
              type="button"
              onClick={handleOpenModal}
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
              {reviews.map((review) => {
                const spoilerHidden = review.has_spoilers && !revealedSpoilers[review.id];
                return (
                  <li
                    key={review.id}
                    className="rounded-2xl border border-border bg-surface/80 p-5 shadow-sm transition hover:border-primary/60"
                  >
                    <div className="flex items-center justify-between text-sm text-text-muted">
                      <div className="font-semibold text-text">
                        {review.users?.display_name || "Usuario Tango"}
                      </div>
                      <time dateTime={review.created_at}>
                        {new Date(review.created_at).toLocaleDateString("es-AR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                    {review.title ? (
                      <h3 className="mt-2 text-base font-semibold text-text">{review.title}</h3>
                    ) : null}
                    <div className="mt-2 text-sm text-text">
                      {spoilerHidden ? (
                        <div className="space-y-2">
                          <p className="font-medium text-amber-400">Esta resena tiene spoilers.</p>
                          <button
                            type="button"
                            onClick={() => handleRevealSpoiler(review.id)}
                            className="rounded-md border border-amber-400 px-3 py-1 text-sm font-medium text-amber-100 transition hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                          >
                            Ver spoilers
                          </button>
                        </div>
                      ) : (
                        <p className="whitespace-pre-line text-text-muted">{review.body}</p>
                      )}
                    </div>
                  </li>
                );
              })}
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

      <ReviewModal
        open={modalOpen}
        gameId={gameId}
        onClose={handleModalClose}
        onCreated={handleModalSuccess}
      />
    </section>
  );
}