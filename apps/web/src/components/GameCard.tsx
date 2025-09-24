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
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return "<1 h";
  return `${Math.round(hours)} h`;
}

export function GameCard({ game }: { game: Game }) {
  const rating = game.game_stats?.rating_avg;
  const hasRating = typeof rating === "number" && !Number.isNaN(rating);
  const genres = game.genres?.map((genre) => genre.name).join(", ");
  const platforms = game.platforms?.map((platform) => platform.name).join(", ");

  return (
    <article className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
          <span>{game.type === "dlc" ? "DLC" : "Juego base"}</span>
          <span>{formatReleaseDate(game.release_date)}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{game.title}</h3>
        {genres && <p className="text-sm text-gray-600">{genres}</p>}
        {platforms && (
          <p className="text-xs text-gray-500">
            Disponible en: <span className="font-medium text-gray-700">{platforms}</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          <span className="font-semibold text-gray-900">Rating:</span>{" "}
          {hasRating ? rating!.toFixed(1) : "N/A"}
        </div>
        <div>
          <span className="font-semibold text-gray-900">Duración:</span> {formatLength(game.est_length_hours)}
        </div>
      </div>
    </article>
  );
}
