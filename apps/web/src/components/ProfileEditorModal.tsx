"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { User } from "@/types";

interface ProfileEditorModalProps {
  open: boolean;
  initialValues: {
    displayName: string;
    bio: string | null;
    avatarUrl?: string | null;
    backdropUrl?: string | null;
  };
  onClose: () => void;
  onUpdated: (user: User) => void;
}

export function ProfileEditorModal({ open, initialValues, onClose, onUpdated }: ProfileEditorModalProps) {
  const [displayName, setDisplayName] = useState(initialValues.displayName);
  const [bio, setBio] = useState(initialValues.bio ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayName(initialValues.displayName);
    setBio(initialValues.bio ?? "");
    setAvatarFile(null);
    setBackdropFile(null);
    setError(null);
  }, [open, initialValues.displayName, initialValues.bio]);

  const hasFileChanges = Boolean(avatarFile || backdropFile);
  const hasTextChanges =
    displayName.trim() !== initialValues.displayName.trim() || (initialValues.bio ?? "") !== bio.trim();
  const hasChanges = hasFileChanges || hasTextChanges;

  const uploadMultipart = async (endpoint: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    await api(endpoint, { method: "POST", body: form });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || !hasChanges) return;

    setLoading(true);
    setError(null);

    try {
      if (hasTextChanges) {
        await api<User>("/users/me/profile", {
          method: "PUT",
          body: JSON.stringify({ displayName: displayName.trim(), bio: bio.trim() || null }),
        });
      }

      const uploads: Array<Promise<unknown>> = [];
      if (avatarFile) uploads.push(uploadMultipart("/users/me/avatar", avatarFile));
      if (backdropFile) uploads.push(uploadMultipart("/users/me/backdrop", backdropFile));
      if (uploads.length) {
        await Promise.all(uploads);
      }

      const refreshed = await api<User>("/auth/me");
      onUpdated(refreshed);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No se pudo actualizar el perfil");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo actualizar el perfil");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface/95 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text">Editar perfil</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-3 py-1 text-sm text-text transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            disabled={loading}
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="text-sm font-medium text-text">
              Nombre a mostrar
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              placeholder="Tu nombre visible"
              required
              minLength={2}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="bio" className="text-sm font-medium text-text">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={280}
              rows={4}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              placeholder="Contale al mundo que estas jugando..."
              disabled={loading}
            />
            <div className="mt-1 text-right text-xs text-text-muted">{bio.length}/280</div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="avatar" className="text-sm font-medium text-text">
                Avatar
              </label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-text file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-2 file:text-xs file:font-medium file:text-text hover:file:border-primary hover:file:text-primary"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-text-muted">Selecciona una imagen cuadrada.</p>
              {initialValues.avatarUrl ? (
                <p className="mt-1 truncate text-xs text-text-muted">Actual: {initialValues.avatarUrl}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="backdrop" className="text-sm font-medium text-text">
                Backdrop
              </label>
              <input
                id="backdrop"
                type="file"
                accept="image/*"
                onChange={(event) => setBackdropFile(event.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-text file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-2 file:text-xs file:font-medium file:text-text hover:file:border-primary hover:file:text-primary"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-text-muted">Imagen horizontal para el encabezado.</p>
              {initialValues.backdropUrl ? (
                <p className="mt-1 truncate text-xs text-text-muted">Actual: {initialValues.backdropUrl}</p>
              ) : null}
            </div>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || !hasChanges}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
