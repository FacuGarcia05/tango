"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { Review, ReviewStats, User } from "@/types";
import { Comments } from "./Comments";

const FALLBACK_AVATAR = "/avatar-placeholder.png";
const FALLBACK_COVER = "/placeholder-cover.svg";

interface ReviewItemProps {
  review: Review;
  currentUser: User | null;
  showGameMeta?: boolean;
  onStatsChange?: (reviewId: string, stats: ReviewStats & { likedByMe: boolean }) => void;
}

export function ReviewItem({ review, currentUser, showGameMeta, onStatsChange }: ReviewItemProps) {
  const initialLikes = review.stats?.likes_count ?? 0;
  const initialComments = review.stats?.comments_count ?? 0;
  const [liked, setLiked] = useState(Boolean(review.likedByMe));
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [spoilerRevealed, setSpoilerRevealed] = useState(!review.has_spoilers);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);

  const author = review.author ?? review.users;
  const profileHref = author?.id ? `/users/${author.id}` : undefined;
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

  const cover = review.game?.cover_url ?? FALLBACK_COVER;

  const handleToggleComments = () => {
    setCommentsOpen((prev) => !prev);
  };

  const handleLike = useCallback(async () => {
    if (!currentUser) {
      setLikeError("Necesitas iniciar sesion para dar like");
      return;
    }
    if (likeLoading) return;
    setLikeLoading(true);
    setLikeError(null);

    try {
      const response = await api<{ liked: boolean; likes_count: number }>(`/reviews/${review.id}/like`, {
        method: "POST",
      });
      setLiked(response.liked);
      setLikesCount(response.likes_count);
      onStatsChange?.(review.id, {
        likes_count: response.likes_count,
        comments_count: commentsCount,
        likedByMe: response.liked,
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message || "No se pudo actualizar el like" : "No se pudo actualizar el like";
      setLikeError(message);
    } finally {
      setLikeLoading(false);
    }
  }, [commentsCount, currentUser, likeLoading, onStatsChange, review.id]);

  const handleCommentCountChange = useCallback(
    (count: number) => {
      setCommentsCount(count);
      onStatsChange?.(review.id, {
        likes_count: likesCount,
        comments_count: count,
        likedByMe: liked,
      });
    },
    [liked, likesCount, onStatsChange, review.id]
  );

  return (
    <article className="space-y-4 rounded-2xl border border-border bg-surface/80 p-5 shadow-sm transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {profileHref ? (
            <Link
              href={profileHref}
              className="relative h-10 w-10 overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Image
                src={author?.avatar_url || FALLBACK_AVATAR}
                alt={author?.display_name || "Usuario"}
                fill
                sizes="40px"
                className="object-cover"
              />
            </Link>
          ) : (
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-border">
              <Image
                src={author?.avatar_url || FALLBACK_AVATAR}
                alt={author?.display_name || "Usuario"}
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
          )}
          <div>
            {profileHref ? (
              <Link
                href={profileHref}
                className="text-sm font-semibold text-text transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {author?.display_name ?? "Usuario Tango"}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-text">{author?.display_name ?? "Usuario Tango"}</p>
            )}
            <p className="text-xs text-text-muted">{createdAt}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLike}
          disabled={likeLoading}
          className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
            liked ? "border-primary bg-primary/10 text-primary" : "border-border text-text"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${liked ? "text-primary" : "text-text"}`}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6.01 4.02 4 6.5 4c1.54 0 2.96.99 3.57 2.36h.01c.6-1.37 2.02-2.36 3.56-2.36C16.98 4 19 6.01 19 8.5c0 3.78-3.4 6.86-8.55 11.54Z" />
          </svg>
          <span>{likesCount}</span>
        </button>
      </div>

      {showGameMeta && review.game ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-bg/60 p-3">
          <div className="relative h-16 w-12 overflow-hidden rounded-lg border border-border/40">
            <Image src={cover} alt={review.game.title} fill sizes="48px" className="object-cover" />
          </div>
          <div>
            <Link
              href={`/games/${review.game.slug}`}
              className="text-sm font-semibold text-primary transition hover:underline"
            >
              {review.game.title}
            </Link>
            <p className="text-xs text-text-muted">{review.game.slug}</p>
          </div>
        </div>
      ) : null}

      {review.title ? <h3 className="text-lg font-semibold text-text">{review.title}</h3> : null}

      <div className="space-y-3">
        {review.has_spoilers && !spoilerRevealed ? (
          <div className="rounded-xl border border-amber-300/50 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Esta resena contiene spoilers.</p>
            <button
              type="button"
              onClick={() => setSpoilerRevealed(true)}
              className="mt-2 rounded-md border border-amber-300 px-3 py-1 text-xs font-semibold transition hover:bg-amber-300/10"
            >
              Mostrar contenido
            </button>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-text-muted">{review.body}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
        <button
          type="button"
          onClick={handleToggleComments}
          className="rounded-full border border-border px-3 py-1 font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {commentsOpen ? "Ocultar comentarios" : `Comentarios (${commentsCount})`}
        </button>
        <span>
          Likes: <span className="font-semibold text-text">{likesCount}</span>
        </span>
      </div>
      {likeError ? <p className="text-xs text-danger">{likeError}</p> : null}

      <Comments
        reviewId={review.id}
        currentUser={currentUser}
        open={commentsOpen}
        onCountChange={handleCommentCountChange}
      />
    </article>
  );
}
