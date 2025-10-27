"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { ApiError } from "@/lib/api";
import { createList } from "@/lib/lists";

export function CreateListForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!title.trim()) {
        setError("El titulo es obligatorio");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const list = await createList({
          title: title.trim(),
          description: description.trim() || undefined,
          isPublic,
        });
        router.push(`/lists/${list.slug}`);
      } catch (submitError) {
        console.error("Failed to create list", submitError);
        setError(
          submitError instanceof ApiError
            ? submitError.message ?? "No se pudo crear la lista"
            : "No se pudo crear la lista",
        );
      } finally {
        setLoading(false);
      }
    },
    [title, description, isPublic, router],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-border bg-surface/80 p-8 shadow-xl">
      <div className="space-y-2">
        <label htmlFor="list-title" className="text-sm font-semibold text-text">
          Titulo
        </label>
        <input
          id="list-title"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Mis indies favoritos"
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-xs text-text-muted">Usa un titulo descriptivo para que sea facil de compartir.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="list-description" className="text-sm font-semibold text-text">
          Descripcion
        </label>
        <textarea
          id="list-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Que tienen en comun estos juegos? Por que deberia jugarlos?"
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-xs text-text-muted">Opcional. Maximo 1000 caracteres.</p>
      </div>

      <label className="flex items-center gap-3 text-sm text-text">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        Hacer esta lista publica
      </label>

      {error ? (
        <p className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Crear lista
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-text transition hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
