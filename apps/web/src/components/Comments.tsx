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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const canSubmit = useMemo(() => body.trim().length > 0 && body.trim().length <= 2000, [body]);
  const editLength = useMemo(() => editBody.trim().length, [editBody]);
  const canSaveEdit = useMemo(
    () => editingId !== null && editLength > 0 && editLength <= 2000,
    [editLength, editingId],
  );

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

  const beginEdit = useCallback(
    (comment: ReviewComment) => {
      setEditingId(comment.id);
      setEditBody(comment.body);
      setError(null);
    },
    [],
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditBody("");
    setSavingEdit(false);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!currentUser || !editingId || !canSaveEdit || savingEdit) {
      return;
    }

    setSavingEdit(true);
    setError(null);

    const payload = editBody.trim();

    try {
      const updated = await api<ReviewComment>(`/reviews/${reviewId}/comments/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ body: payload }),
      });

      setComments((prev) => prev.map((comment) => (comment.id === updated.id ? updated : comment)));
      cancelEdit();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || "No se pudo actualizar el comentario"
          : "No se pudo actualizar el comentario";
      setError(message);
    } finally {
      setSavingEdit(false);
    }
  }, [cancelEdit, canSaveEdit, currentUser, editBody, editingId, reviewId, savingEdit]);

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
        if (editingId === commentId) {
          cancelEdit();
        }
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message || "No se pudo borrar el comentario"
            : "No se pudo borrar el comentario";
        setError(message);
      }
    },
    [cancelEdit, currentUser, editingId, onCountChange, reviewId]
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
            const isAuthor = currentUser?.id === comment.user_id;
            const isEditing = editingId === comment.id;
            const isEdited =
              Boolean(comment.updated_at) &&
              comment.updated_at !== null &&
              comment.updated_at !== comment.created_at;

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
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <time dateTime={comment.created_at}>
                          {new Date(comment.created_at).toLocaleDateString("es-AR", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                        {isEdited ? <span>· Editado</span> : null}
                      </div>
                    </div>
                  </div>
                  {isAuthor ? (
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-text transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginEdit(comment)}
                          className="text-text transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="text-danger transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : null}
                </div>
                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-border bg-bg/80 px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    />
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{editLength}/2000</span>
                      <button
                        type="button"
                        onClick={handleUpdate}
                        disabled={!canSaveEdit || savingEdit}
                        className="rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-contrast transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {savingEdit ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text">{comment.body}</p>
                )}
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
