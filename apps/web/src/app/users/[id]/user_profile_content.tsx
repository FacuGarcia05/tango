"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FollowButton } from "@/components/FollowButton";
import { ReviewItem } from "@/components/ReviewItem";
import { ProfileSearch } from "@/components/ProfileSearch";
import { ApiError, api } from "@/lib/api";
import type { FollowStats, PaginatedReviews, Review, User, UserSummary } from "@/types";

const PAGE_SIZE = 10;
const FALLBACK_AVATAR = "/avatar-placeholder.png";
const FALLBACK_BACKDROP = "/placeholder-cover.svg";

type ProfileTab = "activity" | "reviews" | "ratings";

interface UserProfileContentProps {
  summary: UserSummary;
  initialReviews: PaginatedReviews;
  currentUser: User | null;
  userId: string;
}

type ReviewStatsChange = { likes_count: number; comments_count: number };

export function UserProfileContent({ summary, initialReviews, currentUser, userId }: UserProfileContentProps) {
  const [tab, setTab] = useState<ProfileTab>("activity");
  const [followStats, setFollowStats] = useState<FollowStats>({
    followers: summary.followers,
    following: summary.following,
    isFollowing: summary.isFollowing,
  });
  const [reviews, setReviews] = useState<Review[]>(initialReviews.items);
  const [totalReviews, setTotalReviews] = useState(initialReviews.total);
  const [page, setPage] = useState(1);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const isCurrentUser = currentUser?.id === userId;

  const avatar = summary.profile.avatarUrl ?? summary.user.avatarUrl ?? FALLBACK_AVATAR;
  const backdrop = summary.profile.backdropUrl ?? FALLBACK_BACKDROP;

  const initials = useMemo(() => {
    const source = summary.user.displayName || summary.user.email;
    return source.trim().charAt(0).toUpperCase() || "?";
  }, [summary.user.displayName, summary.user.email]);

  const loadReviews = useCallback(
    async (targetPage: number) => {
      setLoadingReviews(true);
      setReviewsError(null);
      const skip = (targetPage - 1) * PAGE_SIZE;
      try {
        const response = await api<PaginatedReviews>(`/users/${userId}/reviews?take=${PAGE_SIZE}&skip=${skip}`);
        setReviews(response.items);
        setTotalReviews(response.total);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message || "No se pudieron cargar las resenas" : "No se pudieron cargar las resenas";
        setReviewsError(message);
      } finally {
        setLoadingReviews(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (tab === "reviews") {
      loadReviews(page);
    }
  }, [loadReviews, page, tab]);

  const handleStatsChange = useCallback((stats: FollowStats) => {
    setFollowStats(stats);
  }, []);

  const handleReviewStatsChange = useCallback((reviewId: string, stats: ReviewStatsChange) => {
    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              stats: {
                likes_count: stats.likes_count,
                comments_count: stats.comments_count,
              },
            }
          : review
      )
    );
  }, []);

  const canPrev = page > 1;
  const canNext = page * PAGE_SIZE < totalReviews;

  const renderTab = () => {
    if (tab === "activity") {
      return (
        <div className="space-y-4 rounded-2xl border border-border bg-surface/80 p-5">
          <div className="flex flex-wrap items-center gap-4 text-sm text-text">
            <div className="rounded-xl border border-border/40 bg-bg/70 px-4 py-2">
              <span className="font-semibold text-primary">{summary.reviewsCount}</span> resenas publicadas
            </div>
            <div className="rounded-xl border border-border/40 bg-bg/70 px-4 py-2">
              <span className="font-semibold text-primary">{summary.ratingsCount}</span> calificaciones
            </div>
            <div className="rounded-xl border border-border/40 bg-bg/70 px-4 py-2">
              Sigue a <span className="font-semibold text-primary">{followStats.following}</span> jugadores
            </div>
          </div>
          <p className="text-sm text-text-muted">La actividad mostrara proximos eventos y listas destacadas.</p>
        </div>
      );
    }

    if (tab === "reviews") {
      return (
        <div className="space-y-4">
          {loadingReviews ? <p className="text-sm text-text-muted">Cargando resenas...</p> : null}
          {reviewsError ? <p className="text-sm text-danger">{reviewsError}</p> : null}
          {!loadingReviews && !reviewsError && reviews.length === 0 ? (
            <p className="text-sm text-text-muted">Este usuario aun no publico resenas.</p>
          ) : null}
          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                currentUser={currentUser}
                showGameMeta
                onStatsChange={(id, stats) =>
                  handleReviewStatsChange(id, { likes_count: stats.likes_count, comments_count: stats.comments_count })
                }
              />
            ))}
          </div>
          {totalReviews > PAGE_SIZE ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!canPrev || loadingReviews}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-text-muted">
                Pagina {page} de {Math.ceil(totalReviews / PAGE_SIZE)}
              </span>
              <button
                type="button"
                onClick={() => canNext && setPage((prev) => prev + 1)}
                disabled={!canNext || loadingReviews}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-border bg-surface/80 p-5 text-sm text-text-muted">
        Las calificaciones publicas estaran disponibles pronto. Mientras tanto, explora las resenas de este jugador.
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border shadow-xl">
        <div className="relative h-56 w-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent">
          <Image src={backdrop} alt="Backdrop" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
        </div>
        <div className="relative px-6 pb-6 sm:px-10">
          <div className="-mt-16 flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-bg shadow-xl">
              <Image src={avatar} alt={summary.user.displayName || summary.user.email} fill className="object-cover" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-text">{summary.user.displayName}</h1>
                  <p className="text-sm text-text-muted">{summary.user.email}</p>
                </div>
                {!isCurrentUser && currentUser ? (
                  <FollowButton targetUserId={userId} initialStats={followStats} onChange={handleStatsChange} />
                ) : null}
              </div>
              {summary.profile.bio ? (
                <p className="max-w-2xl text-sm text-text-muted">{summary.profile.bio}</p>
              ) : (
                <p className="text-sm text-text-muted">Este jugador aun no agrego una bio.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <ProfileSearch currentUser={currentUser} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setTab("activity")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === "activity" ? "bg-primary text-primary-contrast" : "bg-border text-text"
            }`}
          >
            Actividad
          </button>
          <button
            type="button"
            onClick={() => setTab("reviews")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === "reviews" ? "bg-primary text-primary-contrast" : "bg-border text-text"
            }`}
          >
            Resenas
          </button>
          <button
            type="button"
            onClick={() => setTab("ratings")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === "ratings" ? "bg-primary text-primary-contrast" : "bg-border text-text"
            }`}
          >
            Calificaciones
          </button>
        </div>
        {renderTab()}
      </section>

      <div className="text-xs text-text-muted">
        <Link href="/games" className="text-primary hover:underline">
          Volver al catalogo
        </Link>
      </div>
    </div>
  );
}
