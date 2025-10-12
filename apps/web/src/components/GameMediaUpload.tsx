"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, api } from "@/lib/api";

interface GameMediaUploadProps {
  slug: string;
}

export function GameMediaUpload({ slug }: GameMediaUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file) {
      setError("Selecciona una imagen");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      await api(`/games/${slug}/media/image`, {
        method: "POST",
        body: form,
      });
      setFile(null);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No se pudo subir la imagen");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo subir la imagen");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-surface/80 p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-text">Agregar captura</h3>
        <p className="text-xs text-text-muted">Solo imagenes (maximo 5MB).</p>
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="w-full text-sm text-text file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-2 file:text-xs file:font-medium file:text-text hover:file:border-primary hover:file:text-primary"
        disabled={loading}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Subiendo..." : "Subir imagen"}
      </button>
    </div>
  );
}

