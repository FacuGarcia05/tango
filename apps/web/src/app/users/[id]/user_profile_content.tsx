"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FollowButton } from "@/components/FollowButton";
import { ReviewItem } from "@/components/ReviewItem";
import { ProfileSearch } from "@/components/ProfileSearch";
import { ApiError, api } from "@/lib/api";
import type {
  FollowStats,
  ListPaginatedResponse,
  ListSummary,
  PaginatedReviews,
  Review,
  User,
  UserRating,
  UserRatingsResponse,
  UserSummary,
} from "@/types";

const PAGE_SIZE = 10;
const LISTS_PAGE_SIZE = 6;
const RATINGS_PAGE_SIZE = 8;
const FALLBACK_AVATAR = "/avatar-placeholder.png";
const FALLBACK_BACKDROP = "/placeholder-cover.svg";
const FALLBACK_COVER = "/placeholder-cover.svg";

type ProfileTab = "activity" | "reviews" | "ratings" | "lists";

interface UserProfileContentProps {
  summary: UserSummary;
  initialReviews: PaginatedReviews;
  initialLists: ListPaginatedResponse;
  currentUser: User | null;
  userId: string;
}

type ReviewStatsChange = { likes_count: number; comments_count: number };

export function UserProfileContent({
  summary,
  initialReviews,
  initialLists,
  currentUser,
  userId,
}: UserProfileContentProps) {
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
  const [lists, setLists] = useState<ListSummary[]>(initialLists.items);
  const [totalLists, setTotalLists] = useState(initialLists.total);
  const [listsPage, setListsPage] = useState(1);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [totalRatings, setTotalRatings] = useState(0);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);

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

  const loadLists = useCallback(
    async (targetPage: number) => {
      setLoadingLists(true);
      setListsError(null);

      try {
        const response = await api<ListPaginatedResponse>(
          `/lists/public/by-user/${userId}?page=${targetPage}&take=${LISTS_PAGE_SIZE}`
        );
        setLists(response.items);
        setTotalLists(response.total);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message || "No se pudieron cargar las listas" : "No se pudieron cargar las listas";
        setListsError(message);
      } finally {
        setLoadingLists(false);
      }
    },
    [userId]
  );

  const loadRatings = useCallback(
    async (targetPage: number) => {
      setLoadingRatings(true);
      setRatingsError(null);
      try {
        const response = await api<UserRatingsResponse>(
          `/users/${userId}/ratings?page=${targetPage}&take=${RATINGS_PAGE_SIZE}`
        );
        setRatings(response.items);
        setTotalRatings(response.total);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message || "No se pudieron cargar las calificaciones"
            : "No se pudieron cargar las calificaciones";
        setRatingsError(message);
      } finally {
        setLoadingRatings(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (tab === "lists") {
      loadLists(listsPage);
    }
  }, [tab, listsPage, loadLists]);

  useEffect(() => {
    if (tab === "ratings") {
      loadRatings(ratingsPage);
    }
  }, [tab, ratingsPage, loadRatings]);

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

  const listsCanPrev = listsPage > 1;
  const listsCanNext = listsPage * LISTS_PAGE_SIZE < totalLists;
  const ratingsCanPrev = ratingsPage > 1;
  const ratingsCanNext = ratingsPage * RATINGS_PAGE_SIZE < totalRatings;

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

    if (tab === "lists") {
      return (
        <div className="space-y-4">
          {loadingLists ? <p className="text-sm text-text-muted">Cargando listas...</p> : null}
          {listsError ? <p className="text-sm text-danger">{listsError}</p> : null}
          {!loadingLists && !listsError && lists.length === 0 ? (
            <p className="text-sm text-text-muted">
              {isCurrentUser ? "Todavia no creaste listas publicas." : "Este jugador aun no comparte listas publicas."}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/lists/${list.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-surface/80 p-4 transition hover:-translate-y-1 hover:border-primary/70 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-text">{list.title}</h3>
                  <span className="rounded-full border border-border px-3 py-0.5 text-xs uppercase tracking-wide text-text-muted">
                    {list.items_count} juegos
                  </span>
                </div>
                {list.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-text-muted">{list.description}</p>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">Sin descripcion.</p>
                )}
                {list.items_preview && list.items_preview.length ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
                    {list.items_preview.map((item) => (
                      <span key={item.id} className="rounded-full border border-border px-3 py-0.5 text-text">
                        #{item.position} {item.game.title}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="mt-4 text-xs font-semibold text-primary">Ver lista completa</span>
              </Link>
            ))}
          </div>

          {totalLists > LISTS_PAGE_SIZE ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setListsPage((prev) => Math.max(1, prev - 1))}
                disabled={!listsCanPrev || loadingLists}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-text-muted">
                Pagina {listsPage} de {Math.max(1, Math.ceil(totalLists / LISTS_PAGE_SIZE))}
              </span>
              <button
                type="button"
                onClick={() => listsCanNext && setListsPage((prev) => prev + 1)}
                disabled={!listsCanNext || loadingLists}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (tab === "ratings") {
      return (
        <div className="space-y-4">
          {loadingRatings ? <p className="text-sm text-text-muted">Cargando calificaciones...</p> : null}
          {ratingsError ? <p className="text-sm text-danger">{ratingsError}</p> : null}
          {!loadingRatings && !ratingsError && ratings.length === 0 ? (
            <p className="text-sm text-text-muted">Este jugador aun no compartio calificaciones.</p>
          ) : null}

          <div className="space-y-3">
            {ratings.map((rating) => {
              const game = rating.game;
              const cover = game?.cover_url ?? FALLBACK_COVER;
              const updatedAt = rating.updated_at || rating.created_at;
              const formattedDate = new Date(updatedAt).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <Link
                  key={rating.id}
                  href={game ? `/games/${game.slug}` : "#"}
                  className="flex gap-4 rounded-2xl border border-border/70 bg-surface/80 p-4 transition hover:-translate-y-1 hover:border-primary/70 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <div className="relative h-24 w-16 overflow-hidden rounded-xl border border-border/60 bg-bg/70">
                    <Image src={cover} alt={game?.title || "Juego"} fill className="object-cover" sizes="64px" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-text">{game?.title ?? "Juego eliminado"}</p>
                      <span className="text-xs text-text-muted">{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <svg
                          key={index}
                          viewBox="0 0 24 24"
                          className={`h-4 w-4 ${rating.score >= index + 1 ? "text-primary" : "text-border"}`}
                          fill="currentColor"
                        >
                          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                      ))}
                      <span className="text-sm font-semibold text-text">{rating.score.toFixed(1)} / 5</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalRatings > RATINGS_PAGE_SIZE ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRatingsPage((prev) => Math.max(1, prev - 1))}
                disabled={!ratingsCanPrev || loadingRatings}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-text-muted">
                Pagina {ratingsPage} de {Math.max(1, Math.ceil(totalRatings / RATINGS_PAGE_SIZE))}
              </span>
              <button
                type="button"
                onClick={() => ratingsCanNext && setRatingsPage((prev) => prev + 1)}
                disabled={!ratingsCanNext || loadingRatings}
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
        Selecciona una pestaña para ver la actividad de este jugador.
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
            onClick={() => setTab("lists")}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === "lists" ? "bg-primary text-primary-contrast" : "bg-border text-text"
            }`}
          >
            Listas
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
