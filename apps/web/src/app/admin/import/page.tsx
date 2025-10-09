"use client";

import { FormEvent, useCallback, useState } from "react";

import { ApiError, api } from "@/lib/api";

interface ImportResult {
  success: boolean;
  slug: string;
  error?: string;
}

export default function RawgImportPage() {
  const [slug, setSlug] = useState("");
  const [bulk, setBulk] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[]>([]);

  const headers = adminKey.trim().length ? { "x-rawg-admin-key": adminKey.trim() } : undefined;

  const handleSingleImport = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const value = slug.trim();
      if (!value) return;
      setLoading(true);
      setMessage(null);
      try {
        await api(`/admin/rawg/import/${encodeURIComponent(value)}`, {
          method: "POST",
          headers,
        });
        setResults((prev) => [{ slug: value, success: true }, ...prev]);
        setMessage(`Importado ${value}`);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "No se pudo importar";
        setResults((prev) => [{ slug: value, success: false, error: message }, ...prev]);
        setMessage(message);
      } finally {
        setLoading(false);
      }
    },
    [headers, slug]
  );

  const handleBulkImport = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const slugs = bulk
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (!slugs.length) return;
      setLoading(true);
      setMessage(null);
      try {
        const response = await api<{ total: number; imported: number; errors: ImportResult[] }>(
          `/admin/rawg/import-bulk`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ slugs }),
          }
        );
        const successEntries = slugs
          .filter((slug) => !response.errors?.find((error) => error.slug === slug))
          .map((slug) => ({ slug, success: true }));
        setResults((prev) => [...successEntries, ...(response.errors ?? []), ...prev]);
        setMessage(`Procesados ${response.imported}/${response.total} juegos.`);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "No se pudo importar el lote";
        setMessage(message);
      } finally {
        setLoading(false);
      }
    },
    [bulk, headers]
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-border bg-surface/80 p-6 shadow-lg">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-text">Importar juegos desde RAWG</h1>
        <p className="text-sm text-text-muted">
          Usa este panel interno para poblar la base de datos. Recorda que todos los requests necesitan la clave admin configurada en
          el backend.
        </p>
      </header>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-text">Token admin</label>
        <input
          type="password"
          value={adminKey}
          onChange={(event) => setAdminKey(event.target.value)}
          className="w-full rounded-md border border-border bg-bg/80 px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          placeholder="Ingresa el valor de RAWG_ADMIN_KEY"
        />
      </div>

      <form onSubmit={handleSingleImport} className="space-y-3 rounded-2xl border border-border/60 bg-bg/70 p-4">
        <h2 className="text-lg font-semibold text-text">Importar un juego</h2>
        <input
          type="text"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          placeholder="slug o nombre exacto (ej. celeste)"
        />
        <button
          type="submit"
          disabled={loading || !slug.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Importando..." : "Importar"}
        </button>
      </form>

      <form onSubmit={handleBulkImport} className="space-y-3 rounded-2xl border border-border/60 bg-bg/70 p-4">
        <h2 className="text-lg font-semibold text-text">Importar varios juegos</h2>
        <textarea
          rows={6}
          value={bulk}
          onChange={(event) => setBulk(event.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          placeholder="Un slug por linea"
        />
        <button
          type="submit"
          disabled={loading || !bulk.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Procesando..." : "Importar lote"}
        </button>
      </form>

      {message ? <p className="text-sm text-text-muted">{message}</p> : null}

      {results.length ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Historial</h2>
          <ul className="space-y-1 text-sm">
            {results.map((result, index) => (
              <li key={`${result.slug}-${index}`} className={result.success ? "text-success" : "text-danger"}>
                {result.success ? "✓" : "✗"} {result.slug} {result.error ? `- ${result.error}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
