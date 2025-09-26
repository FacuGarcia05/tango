"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ApiError, api } from "@/lib/api";
import type { Game, Taxonomy } from "@/types";
import { FiltersBar } from "@/components/FiltersBar";
import { GameCard } from "@/components/GameCard";
import { Pagination } from "@/components/Pagination";

import type { DurationFilter, GamesFilters } from "./types";

const DEFAULT_GENRES: Taxonomy[] = [
  { slug: "action", name: "Acción" },
  { slug: "rpg", name: "RPG" },
  { slug: "indie", name: "Indie" },
  { slug: "adventure", name: "Aventura" },
];

const DEFAULT_PLATFORMS: Taxonomy[] = [
  { slug: "pc", name: "PC" },
  { slug: "ps5", name: "PlayStation 5" },
  { slug: "xbox", name: "Xbox Series" },
  { slug: "switch", name: "Nintendo Switch" },
];

const DEFAULT_FILTERS: GamesFilters = {
  q: "",
  genres: [],
  platforms: [],
  duration: "",
  includeDlc: false,
  order: "title",
  direction: "asc",
  page: 1,
  take: 20,
};

function parseList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDuration(value: string | null): DurationFilter {
  if (value === "short" || value === "medium" || value === "long") {
    return value;
  }
  return "";
}

function parseOrder(value: string | null): GamesFilters["order"] {
  return value === "release" || value === "rating" ? value : "title";
}

function parseDirection(value: string | null): GamesFilters["direction"] {
  return value === "desc" ? "desc" : "asc";
}

function clampTake(value: number): number {
  return Math.max(1, Math.min(50, value || DEFAULT_FILTERS.take));
}

function parseBoolean(value: string | null): boolean {
  return value === "true" || value === "1";
}

function parseFiltersFromSearch(params: URLSearchParams | Readonly<URLSearchParams>): GamesFilters {
  const take = clampTake(Number(params.get("take")) || DEFAULT_FILTERS.take);
  const page = Math.max(1, Number(params.get("page")) || DEFAULT_FILTERS.page);

  return {
    q: params.get("q") || DEFAULT_FILTERS.q,
    genres: parseList(params.get("genre")),
    platforms: parseList(params.get("platform")),
    duration: parseDuration(params.get("duration")),
    includeDlc: parseBoolean(params.get("includeDlc")),
    order: parseOrder(params.get("order")),
    direction: parseDirection(params.get("direction")),
    page,
    take,
  };
}

function buildSearchParams(filters: GamesFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.genres.length) params.set("genre", [...filters.genres].sort().join(","));
  if (filters.platforms.length) params.set("platform", [...filters.platforms].sort().join(","));
  if (filters.duration) params.set("duration", filters.duration);
  params.set("includeDlc", String(filters.includeDlc));
  params.set("order", filters.order);
  params.set("direction", filters.direction);
  params.set("page", String(filters.page));
  params.set("take", String(filters.take));
  return params;
}

function areStringArraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function applyDurationFilter(games: Game[], duration: DurationFilter): Game[] {
  if (!duration) return games;

  return games.filter((game) => {
    const length = game.est_length_hours;
    if (length === null || length === undefined) return false;

    if (duration === "short") return length <= 10;
    if (duration === "medium") return length <= 30;
    return length > 30;
  });
}

function extractGamesResponse(response: unknown): { games: Game[]; total: number | null } {
  if (Array.isArray(response)) {
    return { games: response, total: null };
  }

  if (response && typeof response === "object") {
    const dataField = (response as { data?: unknown; items?: unknown; results?: unknown }).data;
    const itemsField = (response as { data?: unknown; items?: unknown; results?: unknown }).items;
    const resultsField = (response as { data?: unknown; items?: unknown; results?: unknown }).results;

    const games = [dataField, itemsField, resultsField].find(Array.isArray) as Game[] | undefined;
    const meta = (response as { meta?: { totalItems?: number; total?: number }; total?: number }).meta;
    let total: number | null = null;

    if (typeof (response as { total?: number }).total === "number") {
      total = (response as { total: number }).total;
    } else if (meta && typeof meta.totalItems === "number") {
      total = meta.totalItems;
    } else if (meta && typeof meta.total === "number") {
      total = meta.total;
    }

    if (Array.isArray(games)) {
      return { games, total: total ?? null };
    }
  }

  return { games: [], total: null };
}
function buildGamesQuery(filters: GamesFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.genres.length) params.set("genre", filters.genres.join(","));
  if (filters.platforms.length) params.set("platform", filters.platforms.join(","));
  params.set("includeDlc", String(filters.includeDlc));
  params.set("order", filters.order);
  params.set("direction", filters.direction);
  params.set("take", String(filters.take));
  params.set("skip", String((filters.page - 1) * filters.take));

  return params.toString();
}

function normalizeFilters(filters: GamesFilters): GamesFilters {
  return {
    ...filters,
    genres: Array.from(new Set(filters.genres)),
    platforms: Array.from(new Set(filters.platforms)),
    duration: filters.duration ?? "",
    includeDlc: Boolean(filters.includeDlc),
    order: filters.order,
    direction: filters.direction,
    page: Math.max(1, filters.page),
    take: clampTake(filters.take),
  };
}

function shouldResetPage(prev: GamesFilters, next: GamesFilters): boolean {
  if (prev.page !== next.page) return false;
  if (prev.take !== next.take) return true;
  if (prev.q !== next.q) return true;
  if (prev.duration !== next.duration) return true;
  if (prev.includeDlc !== next.includeDlc) return true;
  if (prev.order !== next.order) return true;
  if (prev.direction !== next.direction) return true;
  if (!areStringArraysEqual(prev.genres, next.genres)) return true;
  if (!areStringArraysEqual(prev.platforms, next.platforms)) return true;
  return false;
}

export default function GamesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<GamesFilters>(() =>
    parseFiltersFromSearch(new URLSearchParams(searchParams.toString()))
  );
  const [games, setGames] = useState<Game[]>([]);
  const [rawCount, setRawCount] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genreOptions, setGenreOptions] = useState<Taxonomy[]>(DEFAULT_GENRES);
  const [platformOptions, setPlatformOptions] = useState<Taxonomy[]>(DEFAULT_PLATFORMS);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadTaxonomies = async () => {
      try {
        const [genresResult, platformsResult] = await Promise.allSettled([
          api<Taxonomy[]>("/genres", { signal: controller.signal }),
          api<Taxonomy[]>("/platforms", { signal: controller.signal }),
        ]);

        if (!active) return;

        if (genresResult.status === "fulfilled" && Array.isArray(genresResult.value) && genresResult.value.length) {
          setGenreOptions(genresResult.value);
        }

        if (
          platformsResult.status === "fulfilled" &&
          Array.isArray(platformsResult.value) &&
          platformsResult.value.length
        ) {
          setPlatformOptions(platformsResult.value);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("Fallo al cargar taxonomías", err);
      }
    };

    loadTaxonomies();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const nextFilters = parseFiltersFromSearch(new URLSearchParams(searchParams.toString()));
    setFilters((prev) => {
      const normalizedNext = normalizeFilters(nextFilters);
      const normalizedPrev = normalizeFilters(prev);

      const equals =
        normalizedPrev.q === normalizedNext.q &&
        normalizedPrev.duration === normalizedNext.duration &&
        normalizedPrev.includeDlc === normalizedNext.includeDlc &&
        normalizedPrev.order === normalizedNext.order &&
        normalizedPrev.direction === normalizedNext.direction &&
        normalizedPrev.page === normalizedNext.page &&
        normalizedPrev.take === normalizedNext.take &&
        areStringArraysEqual(normalizedPrev.genres, normalizedNext.genres) &&
        areStringArraysEqual(normalizedPrev.platforms, normalizedNext.platforms);

      return equals ? prev : normalizedNext;
    });
  }, [searchParams]);

  const syncUrl = useMemo(() => buildSearchParams(filters).toString(), [filters]);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    if (syncUrl === currentQuery) return;

    const nextUrl = syncUrl ? `${pathname}?${syncUrl}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [syncUrl, router, pathname, searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadGames = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = buildGamesQuery(filters);
        const response = await api<unknown>(`/games?${query}`, { signal: controller.signal });
        if (!active) return;
        const { games: fetched, total: totalCount } = extractGamesResponse(response);
        setRawCount(fetched.length);
        setTotal(totalCount ?? null);
        setGames(applyDurationFilter(fetched, filters.duration));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError) {
          setError(err.message || "No se pudo cargar el catálogo");
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("No se pudo cargar el catálogo");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadGames();

    return () => {
      active = false;
      controller.abort();
    };
  }, [filters]);

  const handleFiltersChange = useCallback(
    (updater: (prev: GamesFilters) => GamesFilters) => {
      setFilters((prev) => {
        const nextDraft = normalizeFilters(updater(prev));
        const next = shouldResetPage(prev, nextDraft) ? { ...nextDraft, page: 1 } : nextDraft;
        return next;
      });
    },
    []
  );

  const handleReset = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      handleFiltersChange((prev) => ({ ...prev, page: Math.max(1, page) }));
    },
    [handleFiltersChange]
  );

  const canPrev = filters.page > 1;
  const canNext = useMemo(() => {
    if (typeof total === "number") {
      return filters.page * filters.take < total;
    }
    return rawCount === filters.take;
  }, [filters.page, filters.take, rawCount, total]);

  return (
    <div className="space-y-8">
      <FiltersBar
        filters={filters}
        genreOptions={genreOptions}
        platformOptions={platformOptions}
        onChange={handleFiltersChange}
        onReset={handleReset}
      />

      {error ? (
        <div className="rounded-2xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        {loading && (
          <p className="text-sm text-text-muted">Cargando catálogo...</p>
        )}

        {!loading && games.length === 0 && !error ? (
          <p className="text-sm text-text-muted">
            No encontramos juegos que coincidan con los filtros seleccionados.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.id ?? game.slug} game={game} />
          ))}
        </div>
      </section>

      <Pagination
        page={filters.page}
        take={filters.take}
        canPrev={canPrev}
        canNext={canNext}
        onPageChange={handlePageChange}
      />
    </div>
  );
}




