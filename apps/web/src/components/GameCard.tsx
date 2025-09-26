import Image from "next/image";
import Link from "next/link";

import type { Game } from "@/types";

function formatReleaseDate(value?: string | null) {
  if (!value) return "Sin fecha";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }
    return date.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Sin fecha";
  }
}

function formatLength(hours?: number | null) {
  if (hours === null || hours === undefined) return "-";
  if (hours < 1) return "<1 h";
  return `${Math.round(hours)} h`;
}

export function GameCard({ game }: { game: Game }) {
  const rating = game.game_stats?.rating_avg;
  const hasRating = typeof rating === "number" && !Number.isNaN(rating);
  const genres = game.genres?.map((genre) => genre.name).join(", ");
  const platforms = game.platforms?.map((platform) => platform.name).join(", ");
  const coverUrl = game.cover_url ?? "/placeholder-cover.svg";

  return (
    <Link
      href={`/games/${game.slug}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <Image
            src={coverUrl}
            alt={game.title}
            fill
            sizes="(min-width: 1024px) 240px, (min-width: 768px) 40vw, 60vw"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            priority={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-bg/20 to-transparent" aria-hidden="true" />
          <div className="absolute top-3 left-3 flex gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="rounded-full bg-primary px-3 py-1 text-primary-contrast">
              {game.type === "dlc" ? "DLC" : "Juego base"}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="text-lg font-semibold text-text transition group-hover:text-primary">
              {game.title}
            </h3>
            <p className="text-xs text-text-muted">{formatReleaseDate(game.release_date)}</p>
          </div>

          {genres ? (
            <p className="line-clamp-2 text-sm text-text-muted">{genres}</p>
          ) : null}

          {platforms ? (
            <p className="text-xs text-text-muted">
              Disponible en: <span className="text-text">{platforms}</span>
            </p>
          ) : null}

          <div className="mt-auto flex items-center justify-between text-sm text-text-muted">
            <div>
              <span className="font-semibold text-text">Rating:</span>{" "}
              {hasRating ? rating!.toFixed(1) : "N/A"}
            </div>
            <div>
              <span className="font-semibold text-text">Duracion:</span> {formatLength(game.est_length_hours)}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}