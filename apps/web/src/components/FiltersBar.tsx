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
    [filters.platforms]
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
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="search" className="text-sm font-medium text-gray-700">
          Buscar juegos
        </label>
        <input
          id="search"
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Elden Ring, Hades, Zelda…"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-gray-700">Géneros</legend>
          <div className="space-y-1 rounded-md border border-gray-200 p-3 max-h-40 overflow-y-auto">
            {genreOptions.map((genre) => (
              <label key={genre.slug} className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={selectedGenres.has(genre.slug)}
                  onChange={() => toggleMultiValue(genre.slug, "genres")}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                {genre.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-gray-700">Plataformas</legend>
          <div className="space-y-1 rounded-md border border-gray-200 p-3 max-h-40 overflow-y-auto">
            {platformOptions.map((platform) => (
              <label
                key={platform.slug}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <input
                  type="checkbox"
                  checked={selectedPlatforms.has(platform.slug)}
                  onChange={() => toggleMultiValue(platform.slug, "platforms")}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                {platform.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Duración estimada</label>
          <select
            value={filters.duration}
            onChange={(event) => handleDurationChange(event.target.value as DurationFilter)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          >
            <option value="">Todas</option>
            <option value="short">Corta (≤10h)</option>
            <option value="medium">Media (≤30h)</option>
            <option value="long">Larga (&gt;30h)</option>
          </select>

          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={filters.includeDlc}
              onChange={(event) => onChange((prev) => ({ ...prev, includeDlc: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            Incluir DLCs
          </label>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Orden</label>
            <select
              value={filters.order}
              onChange={(event) => handleOrderChange(event.target.value as GamesFilters["order"])}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="title">Título</option>
              <option value="release">Fecha de lanzamiento</option>
              <option value="rating">Rating</option>
            </select>
            <select
              value={filters.direction}
              onChange={(event) =>
                handleDirectionChange(event.target.value as GamesFilters["direction"])
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Elementos por página</label>
          <select
            value={filters.take}
            onChange={(event) => handleTakeChange(Number(event.target.value))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
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
            className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-gray-700"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-900 hover:text-gray-900"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
}
