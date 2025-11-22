"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/LogoutButton";
import { ProfileEditorModal } from "@/components/ProfileEditorModal";
import { ProfileSearch } from "@/components/ProfileSearch";
import { ReviewItem } from "@/components/ReviewItem";
import { useAuth } from "@/context/AuthContext";
import { ApiError, api } from "@/lib/api";
import type { PaginatedReviews, Review, UserRating, UserRatingsResponse, UserSummary } from "@/types";

const PAGE_SIZE = 5;
const RATINGS_PAGE_SIZE = 8;
const FALLBACK_COVER = "/placeholder-cover.svg";

type ProfileTab = "activity" | "reviews" | "ratings";

export function ProfileContent() {
  const { user, loading, refresh, setUser, isVerified } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [ratingsTotal, setRatingsTotal] = useState(0);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>("activity");
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const initials = useMemo(() => {
    if (!user) return "?";
    const source = user.displayName || user.email;
    return source.trim().charAt(0).toUpperCase() || "?";
  }, [user]);

  const backdropUrl = summary?.profile.backdropUrl ?? user?.backdropUrl ?? null;
  const avatarUrl = summary?.profile.avatarUrl ?? user?.avatarUrl ?? null;

  const loadSummary = useCallback(async () => {
    if (!user) return;
    setSummaryError(null);
    try {
      const response = await api<UserSummary>(`/users/${user.id}/summary`);
      setSummary(response);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message || "No se pudo cargar tu resumen" : "No se pudo cargar tu resumen";
      setSummaryError(message);
    }
  }, [user]);

  const loadReviews = useCallback(
    async (targetPage: number) => {
      if (!user) return;
      setReviewsLoading(true);
      setReviewsError(null);
      const skip = (targetPage - 1) * PAGE_SIZE;
      try {
        const response = await api<PaginatedReviews>(`/users/${user.id}/reviews?take=${PAGE_SIZE}&skip=${skip}`);
        setReviews(response.items);
        setTotal(response.total);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message || "No se pudieron cargar tus resenas" : "No se pudieron cargar tus resenas";
        setReviewsError(message);
      } finally {
        setReviewsLoading(false);
      }
    },
    [user]
  );

  const loadRatings = useCallback(
    async (targetPage: number) => {
      if (!user) return;
      setRatingsLoading(true);
      setRatingsError(null);
      try {
        const response = await api<UserRatingsResponse>(
          `/users/${user.id}/ratings?page=${targetPage}&take=${RATINGS_PAGE_SIZE}`
        );
        setRatings(response.items);
        setRatingsTotal(response.total);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message || "No se pudieron cargar tus calificaciones"
            : "No se pudieron cargar tus calificaciones";
        setRatingsError(message);
      } finally {
        setRatingsLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    loadSummary();
  }, [loadSummary, user]);

  useEffect(() => {
    if (!user || tab !== "reviews") return;
    loadReviews(page);
  }, [loadReviews, page, tab, user]);

  useEffect(() => {
    if (!user || tab !== "ratings") return;
    loadRatings(ratingsPage);
  }, [loadRatings, ratingsPage, tab, user]);

  const handleOpenEditor = () => setEditorOpen(true);
  const handleCloseEditor = () => setEditorOpen(false);

  const handleProfileUpdated = useCallback(
    (nextUser: any) => {
      setUser(nextUser);
      loadSummary();
    },
    [loadSummary, setUser]
  );

  const canPrev = page > 1;
  const canNext = page * PAGE_SIZE < total;
  const ratingsCanPrev = ratingsPage > 1;
  const ratingsCanNext = ratingsPage * RATINGS_PAGE_SIZE < ratingsTotal;

  if (loading && !user) {
    return (
      <section className="space-y-6 rounded-3xl border border-border bg-surface/90 p-8 shadow-xl">
        <p className="text-sm text-text-muted">Cargando perfil...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="space-y-6 rounded-3xl border border-border bg-surface/90 p-8 shadow-xl">
        <p className="text-sm text-danger">No se pudo cargar tu perfil.</p>
        <button
          type="button"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text"
          onClick={refresh}
        >
          Reintentar
        </button>
      </section>
    );
  }

  const verificationBanner = !isVerified ? (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
      Aun no verificaste tu email. Revisa tu bandeja o reenvia el enlace desde el login.
    </div>
  ) : null;

  const activityStats = summary
    ? [
        { label: "Seguidores", value: summary.followers },
        { label: "Siguiendo", value: summary.following },
        { label: "Resenas", value: summary.reviewsCount },
        { label: "Calificaciones", value: summary.ratingsCount },
      ]
    : [];

  const renderTab = () => {
    if (tab === "activity") {
      return (
        <div className="space-y-4">
          {summaryError ? <p className="text-sm text-danger">{summaryError}</p> : null}
          {verificationBanner}
          <div className="grid gap-4 sm:grid-cols-2">
            {activityStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/60 bg-bg/70 p-4 text-sm text-text-muted">
                <p className="text-xs uppercase tracking-wide">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-text">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tab === "reviews") {
      return (
        <div className="space-y-4">
          {reviewsLoading ? <p className="text-sm text-text-muted">Cargando resenas...</p> : null}
          {reviewsError ? <p className="text-sm text-danger">{reviewsError}</p> : null}

          {!reviewsLoading && !reviewsError && reviews.length === 0 ? (
            <p className="text-sm text-text-muted">Todavia no escribiste resenas.</p>
          ) : null}

          <div className="space-y-4">
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} currentUser={user} showGameMeta />
            ))}
          </div>

          {total > PAGE_SIZE ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!canPrev || reviewsLoading}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-text-muted">Pagina {page}</span>
              <button
                type="button"
                onClick={() => canNext && setPage((prev) => prev + 1)}
                disabled={!canNext || reviewsLoading}
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
          {ratingsLoading ? <p className="text-sm text-text-muted">Cargando calificaciones...</p> : null}
          {ratingsError ? <p className="text-sm text-danger">{ratingsError}</p> : null}
          {!ratingsLoading && !ratingsError && ratings.length === 0 ? (
            <p className="text-sm text-text-muted">Todavia no calificaste juegos.</p>
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
                  className="flex gap-4 rounded-2xl border border-border/70 bg-surface/80 p-4 shadow-sm transition hover:-translate-y-1 hover:border-primary/70 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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

          {ratingsTotal > RATINGS_PAGE_SIZE ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRatingsPage((prev) => Math.max(1, prev - 1))}
                disabled={!ratingsCanPrev || ratingsLoading}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-text-muted">
                Pagina {ratingsPage} de {Math.max(1, Math.ceil(ratingsTotal / RATINGS_PAGE_SIZE))}
              </span>
              <button
                type="button"
                onClick={() => ratingsCanNext && setRatingsPage((prev) => prev + 1)}
                disabled={!ratingsCanNext || ratingsLoading}
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
      <div className="rounded-2xl border border-border bg-surface/80 p-4 text-sm text-text-muted">
        Selecciona una pestaña para ver tu actividad.
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border shadow-xl">
        {!isVerified ? (
          <div className="border-b border-warning/40 bg-warning/10 px-6 py-3 text-sm text-warning">
            Aun no verificaste tu email. Revisa tu bandeja o reenvia el enlace desde el login.
          </div>
        ) : null}
        <div className="relative h-64 w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent">
          {backdropUrl ? <Image src={backdropUrl} alt="Backdrop" fill className="object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        </div>
        <div className="relative px-6 pb-6 sm:px-10">
          <div className="-mt-16 flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-bg shadow-xl">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={user.displayName || user.email} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary text-4xl font-semibold text-primary-contrast">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-text">{user.displayName || user.email}</h1>
                <p className="text-sm text-text-muted">{user.email}</p>
                {isVerified ? (
                  <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-success">
                    Email verificado
                  </span>
                ) : (
                  <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-warning">
                    Email pendiente de verificacion
                  </span>
                )}
              </div>
              {summary?.profile.bio ? (
                <p className="max-w-3xl text-sm text-text-muted">{summary.profile.bio}</p>
              ) : (
                <p className="text-sm text-text-muted">Agrega una bio para contar tus gustos y juegos favoritos.</p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleOpenEditor}
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  Editar perfil
                </button>
                <LogoutButton />
                <Link
                  href="/lists/new"
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  Nueva lista
                </Link>
                <Link
                  href="/backlog"
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  Ver backlog
                </Link>
                <Link
                  href="/me/lists"
                  className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  Gestionar listas
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProfileSearch currentUser={user} />

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

      <ProfileEditorModal
        open={editorOpen}
        onClose={handleCloseEditor}
        onUpdated={handleProfileUpdated}
        initialValues={{
          displayName: user.displayName,
          bio: summary?.profile.bio ?? user.bio ?? null,
          avatarUrl: summary?.profile.avatarUrl ?? user.avatarUrl ?? null,
          backdropUrl: summary?.profile.backdropUrl ?? user.backdropUrl ?? null,
        }}
      />
    </div>
  );
}
