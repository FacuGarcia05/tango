"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { ReviewComment, User } from "@/types";

interface CommentsProps {
  reviewId: string;
  currentUser: User | null;
  open: boolean;
  onCountChange?: (count: number) => void;
}

export function Comments({ reviewId, currentUser, open, onCountChange }: CommentsProps) {
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => body.trim().length > 0 && body.trim().length <= 2000, [body]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<ReviewComment[]>(`/reviews/${reviewId}/comments`, {
          signal: controller.signal,
        });
        if (!cancelled) {
          setComments(data);
          onCountChange?.(data.length);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message || "No se pudieron cargar los comentarios"
            : "No se pudieron cargar los comentarios";
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
  }, [open, onCountChange, reviewId]);

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      if (!currentUser || !canSubmit || submitting) return;

      setSubmitting(true);
      setError(null);

      try {
        const next = await api<ReviewComment>(`/reviews/${reviewId}/comments`, {
          method: "POST",
          body: JSON.stringify({ body }),
        });
        setComments((prev) => [...prev, next]);
        setBody("");
        onCountChange?.(comments.length + 1);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message || "No se pudo publicar el comentario"
            : "No se pudo publicar el comentario";
        setError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [body, canSubmit, comments.length, currentUser, onCountChange, reviewId, submitting]
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!currentUser) return;

      try {
        await api(`/reviews/${reviewId}/comments/${commentId}`, {
          method: "DELETE",
        });
        setComments((prev) => {
          const next = prev.filter((comment) => comment.id !== commentId);
          onCountChange?.(next.length);
          return next;
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message || "No se pudo borrar el comentario"
            : "No se pudo borrar el comentario";
        setError(message);
      }
    },
    [currentUser, onCountChange, reviewId]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-border/60 bg-surface/60 p-4">
      {loading ? <p className="text-xs text-text-muted">Cargando comentarios...</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}

      {comments.length ? (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const authorHref = comment.author.id ? `/users/${comment.author.id}` : undefined;
            const avatarSrc = comment.author.avatar_url || "/avatar-placeholder.png";
            return (
              <li key={comment.id} className="rounded-lg border border-border/40 bg-bg/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {authorHref ? (
                      <Link
                        href={authorHref}
                        className="relative h-8 w-8 overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      >
                        <Image src={avatarSrc} alt={comment.author.display_name || "Usuario"} fill sizes="32px" />
                      </Link>
                    ) : (
                      <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border">
                        <Image src={avatarSrc} alt={comment.author.display_name || "Usuario"} fill sizes="32px" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      {authorHref ? (
                        <Link
                          href={authorHref}
                          className="text-xs font-semibold text-text transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                          {comment.author.display_name}
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold text-text">{comment.author.display_name}</span>
                      )}
                      <time dateTime={comment.created_at} className="text-xs text-text-muted">
                        {new Date(comment.created_at).toLocaleDateString("es-AR", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                  {currentUser?.id === comment.user_id ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs font-semibold text-danger transition hover:underline"
                    >
                      Borrar
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text">{comment.body}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        !loading && <p className="text-xs text-text-muted">Aun no hay comentarios</p>
      )}

      {currentUser ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder="Escribe un comentario (max 2000 caracteres)"
            className="w-full rounded-md border border-border bg-bg/80 px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{body.trim().length}/2000</span>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-contrast transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Publicando..." : "Comentar"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-text-muted">Inicia sesion para comentar.</p>
      )}
    </div>
  );
}
