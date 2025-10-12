"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { ApiError, api } from "@/lib/api";

interface SetCoverModalProps {
  slug: string;
  currentCover?: string;
}

export function SetCoverModal({ slug, currentCover = "" }: SetCoverModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Selecciona una imagen antes de guardar");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await api(`/games/${slug}/cover`, {
        method: "POST",
        body: form,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No se pudo actualizar la portada");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo actualizar la portada");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        Subir nueva portada
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-text">Actualizar portada</h3>
                <p className="text-sm text-text-muted">Elegi una imagen 2:3. Tamano maximo 5MB.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-text-muted transition hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label="Cerrar"
                disabled={loading}
              >
                X
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="cover-file" className="block text-sm font-medium text-text">
                  Archivo de imagen
                </label>
                <input
                  id="cover-file"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-sm text-text file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-2 file:text-xs file:font-medium file:text-text hover:file:border-primary hover:file:text-primary"
                  disabled={loading}
                />
              </div>

              {currentCover ? <p className="text-xs text-text-muted">Portada actual: {currentCover}</p> : null}
              {error ? <p className="text-sm text-danger">{error}</p> : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

