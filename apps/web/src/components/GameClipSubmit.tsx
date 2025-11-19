"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, api } from "@/lib/api";

interface GameClipSubmitProps {
  slug: string;
}

export function GameClipSubmit({ slug }: GameClipSubmitProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError("Pega un enlace valido");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api(`/games/${slug}/media/clip`, {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setUrl("");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No se pudo guardar el clip");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo guardar el clip");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-surface/80 p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-text">Compartir clip</h3>
        <p className="text-xs text-text-muted">YouTube o Twitch. Maximo 5 aportes por juego.</p>
      </div>
      <input
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://youtu.be/..."
        className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none transition placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
        disabled={loading}
      />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Guardando..." : "Agregar clip"}
      </button>
    </div>
  );
}
