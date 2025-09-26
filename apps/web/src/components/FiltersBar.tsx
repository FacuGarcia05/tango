"use client";

import { useEffect, useMemo, useState } from "react";

import type { DurationFilter, GamesFilters } from "@/app/games/types";
import type { Taxonomy } from "@/types";

interface FiltersBarProps {
  filters: GamesFilters;
  genreOptions: Taxonomy[];
  platformOptions: Taxonomy[];
  onChange: (updater: (prev: GamesFilters) => GamesFilters) => void;
  onReset: () => void;
}

const takeOptions = [10, 20, 30, 40, 50];

export function FiltersBar({
  filters,
  genreOptions,
  platformOptions,
  onChange,
  onReset,
}: FiltersBarProps) {
  const [searchValue, setSearchValue] = useState(filters.q);

  useEffect(() => {
    setSearchValue(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchValue === filters.q) {
        return;
      }
      onChange((prev) => ({ ...prev, q: searchValue }));
    }, 400);

    return () => clearTimeout(handler);
  }, [searchValue, filters.q, onChange]);

  const selectedGenres = useMemo(() => new Set(filters.genres), [filters.genres]);
  const selectedPlatforms = useMemo(
    () => new Set(filters.platforms),
    [filters.platforms],
  );

  const toggleMultiValue = (value: string, key: "genres" | "platforms") => {
    onChange((prev) => {
      const nextValues = new Set(prev[key]);
      if (nextValues.has(value)) {
        nextValues.delete(value);
      } else {
        nextValues.add(value);
      }
      return { ...prev, [key]: Array.from(nextValues) };
    });
  };

  const handleDurationChange = (value: DurationFilter) => {
    onChange((prev) => ({ ...prev, duration: value }));
  };

  const handleOrderChange = (value: GamesFilters["order"]) => {
    onChange((prev) => ({ ...prev, order: value }));
  };

  const handleDirectionChange = (value: GamesFilters["direction"]) => {
    onChange((prev) => ({ ...prev, direction: value }));
  };

  const handleTakeChange = (value: number) => {
    onChange((prev) => ({ ...prev, take: value }));
  };

  const handleApply = () => {
    onChange((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6 rounded-3xl border border-border bg-surface/90 p-6 shadow-lg">
      <div>
        <label htmlFor="search" className="text-sm font-medium text-text">
          Buscar juegos
        </label>
        <input
          id="search"
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Elden Ring, Hades, Zelda..."
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-text">Generos</legend>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border/80 bg-bg/40 p-3">
            {genreOptions.map((genre) => (
              <label key={genre.slug} className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={selectedGenres.has(genre.slug)}
                  onChange={() => toggleMultiValue(genre.slug, "genres")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/60"
                />
                {genre.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-text">Plataformas</legend>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border/80 bg-bg/40 p-3">
            {platformOptions.map((platform) => (
              <label key={platform.slug} className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.has(platform.slug)}
                  onChange={() => toggleMultiValue(platform.slug, "platforms")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/60"
                />
                {platform.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-text">Duracion estimada</label>
          <select
            value={filters.duration}
            onChange={(event) => handleDurationChange(event.target.value as DurationFilter)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            <option value="">Todas</option>
            <option value="short">Corta (&lt;=10h)</option>
            <option value="medium">Media (&lt;=30h)</option>
            <option value="long">Larga (&gt;30h)</option>
          </select>

          <label className="flex items-center gap-2 text-sm font-semibold text-text">
            <input
              type="checkbox"
              checked={filters.includeDlc}
              onChange={(event) => onChange((prev) => ({ ...prev, includeDlc: event.target.checked }))}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/60"
            />
            Incluir DLCs
          </label>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-text">Orden</label>
            <select
              value={filters.order}
              onChange={(event) => handleOrderChange(event.target.value as GamesFilters["order"])}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <option value="title">Titulo</option>
              <option value="release">Fecha de lanzamiento</option>
              <option value="rating">Rating</option>
            </select>
            <select
              value={filters.direction}
              onChange={(event) => handleDirectionChange(event.target.value as GamesFilters["direction"])}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-text">Elementos por pagina</label>
          <select
            value={filters.take}
            onChange={(event) => handleTakeChange(Number(event.target.value))}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
          >
            {takeOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-md border border-border px-3 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
}
