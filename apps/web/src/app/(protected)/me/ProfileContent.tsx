"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import { ProfileEditorModal } from "@/components/ProfileEditorModal";
import { UserReviewItem } from "@/components/UserReviewItem";
import { LogoutButton } from "@/components/LogoutButton";
import { useAuth } from "@/context/AuthContext";
import type { PaginatedReviews, Review, User } from "@/types";

const PAGE_SIZE = 5;

export function ProfileContent() {
  const { user, loading, refresh, setUser } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const initials = useMemo(() => {
    if (!user) return "?";
    const source = user.displayName || user.email;
    return source.trim().charAt(0).toUpperCase() || "?";
  }, [user]);

  const backdropUrl = user?.backdropUrl ?? null;
  const avatarUrl = user?.avatarUrl ?? null;

  const loadReviews = useCallback(
    async (targetPage: number) => {
      if (!user) return;
      setReviewsLoading(true);
      setReviewsError(null);
      const skip = (targetPage - 1) * PAGE_SIZE;
      try {
        const response = await api<PaginatedReviews>(`/users/me/reviews?take=${PAGE_SIZE}&skip=${skip}`);
        setReviews(response.items);
        setTotal(response.total);
      } catch (err) {
        if (err instanceof ApiError) {
          setReviewsError(err.message || "No se pudieron cargar tus reseñas");
        } else if (err instanceof Error) {
          setReviewsError(err.message);
        } else {
          setReviewsError("No se pudieron cargar tus reseñas");
        }
      } finally {
        setReviewsLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;
    loadReviews(page);
  }, [user, page, loadReviews]);

  const handleOpenEditor = () => setEditorOpen(true);
  const handleCloseEditor = () => setEditorOpen(false);

  const handleProfileUpdated = useCallback(
    async (nextUser: User) => {
      setUser(nextUser);
      await refresh();
    },
    [refresh, setUser],
  );

  const canPrev = page > 1;
  const canNext = page * PAGE_SIZE < total;

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
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-border shadow-xl">
        <div className="relative h-64 w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent">
          {backdropUrl ? (
            <Image src={backdropUrl} alt="Backdrop" fill className="object-cover" />
          ) : null}
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
            <div className="flex-1 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-text">
                    {user.displayName || user.email}
                  </h1>
                  <p className="text-sm text-text-muted">{user.email}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleOpenEditor}
                    className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    Editar perfil
                  </button>
                  <LogoutButton />
                </div>
              </div>
              {user.bio ? (
                <p className="max-w-3xl text-sm text-text-muted">{user.bio}</p>
              ) : (
                <p className="text-sm text-text-muted">Agrega una bio para contar tus gustos y juegos favoritos.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text">Mis reseñas</h2>
            <p className="text-sm text-text-muted">
              {total === 0 ? "Todavía no escribiste reseñas" : `${total} reseñas publicadas`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!canPrev || reviewsLoading}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-text-muted">Página {page}</span>
            <button
              type="button"
              onClick={() => canNext && setPage((prev) => prev + 1)}
              disabled={!canNext || reviewsLoading}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </header>

        {reviewsLoading ? <p className="text-sm text-text-muted">Cargando reseñas...</p> : null}
        {reviewsError ? <p className="text-sm text-danger">{reviewsError}</p> : null}

        {!reviewsLoading && !reviewsError && reviews.length === 0 ? (
          <p className="text-sm text-text-muted">Cuando publiques reseñas aparecerán acá.</p>
        ) : null}

        <div className="space-y-4">
          {reviews.map((review) => (
            <UserReviewItem key={review.id} review={review} />
          ))}
        </div>
      </section>

      <ProfileEditorModal
        open={editorOpen}
        onClose={handleCloseEditor}
        onUpdated={handleProfileUpdated}
        initialValues={{
          displayName: user.displayName,
          bio: user.bio ?? null,
          avatarUrl: user.avatarUrl ?? null,
          backdropUrl: user.backdropUrl ?? null,
        }}
      />
    </div>
  );
}
