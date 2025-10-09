import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GameMediaUpload } from "@/components/GameMediaUpload";
import { GameRatingPanel } from "@/components/GameRatingPanel";
import { ReviewsSection } from "@/components/ReviewsSection";
import { SetCoverModal } from "@/components/SetCoverModal";
import { ApiError, apiServer } from "@/lib/api";
import type { Game, GameDetail, Taxonomy, User } from "@/types";

const FALLBACK_COVER = "/placeholder-cover.svg";

function formatReleaseDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }
  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDuration(hours?: number | null) {
  if (hours === null || hours === undefined) {
    return "-";
  }
  if (hours < 1) {
    return "<1 h";
  }
  return `${Math.round(hours)} h`;
}

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let game: GameDetail | null = null;

  try {
    game = await apiServer<GameDetail>(`/games/${slug}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  if (!game) {
    notFound();
  }

  const [dlcs, me] = await Promise.all([
    apiServer<Game[]>(`/games/${slug}/dlcs`).catch(() => [] as Game[]),
    apiServer<User>(`/auth/me`).catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      console.error("Failed to load current user for game detail", error);
      return null;
    }),
  ]);

  let myRating: { value: number | null } | null = null;
  if (me) {
    myRating = await apiServer<{ value: number | null }>(`/games/${slug}/ratings/me`).catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return { value: null };
      }
      console.error("Failed to load rating for current user", error);
      return { value: null };
    });
  }

  const genreEntries: Taxonomy[] = game.genres ?? [];
  const platformEntries: Taxonomy[] = game.platforms ?? [];
  const parentGame = game.parentGame ?? null;
  const coverUrl = game.cover_url ?? FALLBACK_COVER;
  const parseMetric = (value: unknown) => {
    if (value === null || value === undefined) return null;
    const num = typeof value === "number" ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const ratingAvg = parseMetric(game.game_stats?.rating_avg);
  const ratingCount = parseMetric(game.game_stats?.rating_count) ?? 0;
  const reviewCount = parseMetric(game.game_stats?.review_count) ?? 0;
  const normalizedStats = game.game_stats
    ? {
        rating_avg: ratingAvg,
        rating_count: ratingCount,
        review_count: reviewCount,
      }
    : null;

  return (
    <div className="space-y-12">
      <section className="grid gap-8 rounded-3xl border border-border bg-surface/80 p-6 shadow-lg backdrop-blur lg:grid-cols-[320px,1fr] lg:p-10">
        <div className="relative overflow-hidden rounded-2xl border border-border">
          <Image
            src={coverUrl}
            alt={`Portada de ${game.title}`}
            width={640}
            height={960}
            sizes="(min-width: 1024px) 320px, 80vw"
            className="h-full w-full object-cover"
            priority
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide">
            <span className="rounded-full bg-primary px-3 py-1 text-primary-contrast">
              {game.type === "dlc" ? "DLC" : "Juego base"}
            </span>
            {parentGame && game.type === "dlc" ? (
              <Link
                href={`/games/${parentGame.slug}`}
                className="rounded-full border border-border px-3 py-1 text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                Ver juego base
              </Link>
            ) : null}
            {game.release_date ? (
              <span className="rounded-full border border-border px-3 py-1 text-text-muted">
                Lanzamiento: {formatReleaseDate(game.release_date)}
              </span>
            ) : null}
            <span className="rounded-full border border-border px-3 py-1 text-text-muted">
              Duracion: {formatDuration(game.est_length_hours)}
            </span>
            {ratingAvg !== null && Number.isFinite(ratingAvg) ? (
              <span className="rounded-full bg-success/20 px-3 py-1 text-success">
                Rating: {ratingAvg.toFixed(1)} ({ratingCount})
              </span>
            ) : (
              <span className="rounded-full border border-border px-3 py-1 text-text-muted">Sin rating</span>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-text">{game.title}</h1>
                <p className="mt-2 text-sm text-text-muted">
                  {genreEntries.length ? genreEntries.map((genre) => genre.name).join(", ") : "Generos no disponibles"}
                </p>
              </div>
              {me ? (
                <div className="flex flex-col gap-3">
                  <SetCoverModal slug={game.slug} currentCover={game.cover_url ?? ""} />
                  <GameMediaUpload slug={game.slug} />
                </div>
              ) : null}
            </div>

            {game.description ? (
              <p className="max-w-3xl whitespace-pre-wrap text-base text-text">{game.description}</p>
            ) : null}

            {platformEntries.length ? (
              <p className="text-sm text-text-muted">
                Plataformas: <span className="text-text">{platformEntries.map((platform) => platform.name).join(", ")}</span>
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {dlcs.length ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text">Contenido adicional</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dlcs.map((dlc) => (
              <Link
                key={dlc.id ?? dlc.slug}
                href={`/games/${dlc.slug}`}
                className="rounded-2xl border border-border bg-surface/80 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">DLC</div>
                <div className="mt-2 text-base font-semibold text-text">{dlc.title}</div>
                <div className="mt-1 text-xs text-text-muted">Lanzamiento: {formatReleaseDate(dlc.release_date)}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <GameRatingPanel slug={game.slug} stats={normalizedStats} initialValue={myRating?.value ?? null} currentUser={me} />

      <ReviewsSection slug={game.slug} gameId={game.id} reviewCount={reviewCount} currentUser={me} />

      <footer className="rounded-2xl border border-border bg-surface/70 px-4 py-3 text-xs text-text-muted">
        Data & images from{" "}
        <Link href={`https://rawg.io/games/${game.slug}`} className="text-primary underline-offset-2 hover:underline" target="_blank">
          RAWG
        </Link>
      </footer>
    </div>
  );
}
