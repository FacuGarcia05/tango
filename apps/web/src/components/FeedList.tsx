"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchFeed } from "@/lib/feed";
import type { FeedActivity, FeedResponse } from "@/types";
import { MuteButton } from "./MuteButton";

interface FeedListProps {
  initialData: FeedResponse;
  showMuteButton?: boolean;
  enableLoadMore?: boolean;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ActivityCard({
  activity,
  showMuteButton,
}: {
  activity: FeedActivity;
  showMuteButton: boolean;
}) {
  const createdAt = formatTimestamp(activity.created_at);

  const description = useMemo(() => {
    const actorName = activity.actor.display_name;
    const metadata = activity.metadata as Record<string, unknown> | undefined;
    const listSlug = typeof metadata?.list_slug === "string" ? (metadata.list_slug as string) : "";
    const listTitle =
      typeof metadata?.list_title === "string" ? (metadata.list_title as string) : "";
    switch (activity.verb) {
      case "follow": {
        const target = activity.payload?.target;
        if (!target) {
          return `${actorName} empezo a seguir a alguien`;
        }
        return (
          <>
            <Link href={`/users/${activity.actor.id}`} className="font-semibold text-text transition hover:text-primary">
              {actorName}
            </Link>{" "}
            ahora sigue a{" "}
            <Link href={`/users/${target.id}`} className="font-semibold text-text transition hover:text-primary">
              {target.display_name}
            </Link>
          </>
        );
      }
      case "review:create": {
        const game = activity.payload?.game;
        return (
          <>
            <Link href={`/users/${activity.actor.id}`} className="font-semibold text-text transition hover:text-primary">
              {actorName}
            </Link>{" "}
            publico una resena de{" "}
            {game ? (
              <Link href={`/games/${game.slug}`} className="font-semibold text-text transition hover:text-primary">
                {game.title}
              </Link>
            ) : (
              "un juego"
            )}
          </>
        );
      }
      case "rating:update": {
        const rating = activity.payload?.rating;
        const game = activity.payload?.game;
        return (
          <>
            <Link href={`/users/${activity.actor.id}`} className="font-semibold text-text transition hover:text-primary">
              {actorName}
            </Link>{" "}
            califico{" "}
            {game ? (
              <Link href={`/games/${game.slug}`} className="font-semibold text-text transition hover:text-primary">
                {game.title}
              </Link>
            ) : (
              "un juego"
            )}{" "}
            con {rating ? Number(rating.score).toFixed(1) : "N/A"} estrellas
          </>
        );
      }
      case "list:create": {
        return (
          <>
            <Link href={`/users/${activity.actor.id}`} className="font-semibold text-text transition hover:text-primary">
              {actorName}
            </Link>{" "}
            creo una nueva lista{" "}
            <Link href={`/lists/${listSlug}`} className="font-semibold text-text transition hover:text-primary">
              {listTitle}
            </Link>
          </>
        );
      }
      case "list:publish": {
        return (
          <>
            <Link href={`/users/${activity.actor.id}`} className="font-semibold text-text transition hover:text-primary">
              {actorName}
            </Link>{" "}
            publico la lista{" "}
            <Link href={`/lists/${listSlug}`} className="font-semibold text-text transition hover:text-primary">
              {listTitle}
            </Link>
          </>
        );
      }
      case "list:add": {
        const game = activity.payload?.game;
        return (
          <>
            <Link href={`/users/${activity.actor.id}`} className="font-semibold text-text transition hover:text-primary">
              {actorName}
            </Link>{" "}
            agrego {game ? game.title : "un juego"} a{" "}
            <Link href={`/lists/${listSlug}`} className="font-semibold text-text transition hover:text-primary">
              {listTitle || "una lista"}
            </Link>
          </>
        );
      }
      case "list:reorder": {
        return (
          <>
            <Link href={`/users/${activity.actor.id}`} className="font-semibold text-text transition hover:text-primary">
              {actorName}
            </Link>{" "}
            actualizo el orden de{" "}
            <Link href={`/lists/${listSlug}`} className="font-semibold text-text transition hover:text-primary">
              {listTitle || "una lista"}
            </Link>
          </>
        );
      }
      default:
        return `${actorName} tuvo actividad reciente`;
    }
  }, [activity]);

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-surface/80 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border bg-background">
            {activity.actor.avatar_url ? (
              <Image src={activity.actor.avatar_url} alt={activity.actor.display_name} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-text-muted">
                {activity.actor.display_name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="text-sm text-text">{description}</div>
            {createdAt ? <p className="text-xs text-text-muted">{createdAt}</p> : null}
          </div>
        </div>
        {showMuteButton ? <MuteButton userId={activity.actor.id} /> : null}
      </header>

      {activity.verb === "review:create" && activity.payload?.review ? (
        <div className="rounded-xl border border-border bg-background/60 p-4">
          <p className="text-sm font-semibold text-text">
            {activity.payload.review.title || "Resena sin titulo"}
          </p>
          <p className="mt-2 text-sm text-text-muted">
            {activity.payload.review.has_spoilers ? "Contiene spoilers" : "Sin spoilers"}
          </p>
          <p className="mt-3 text-sm text-text">{activity.payload.review.excerpt}</p>
        </div>
      ) : null}

      {activity.payload?.game ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border bg-background">
            <Image
              src={activity.payload.game.cover_url ?? "/placeholder-cover.svg"}
              alt={activity.payload.game.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <Link
              href={`/games/${activity.payload.game.slug}`}
              className="text-sm font-semibold text-text transition hover:text-primary"
            >
              {activity.payload.game.title}
            </Link>
            {activity.verb === "list:add" ? (
              <p className="text-xs text-text-muted">Agregado a la lista</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function FeedList({
  initialData,
  showMuteButton = true,
  enableLoadMore = true,
}: FeedListProps) {
  const [items, setItems] = useState<FeedActivity[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [take] = useState(initialData.take);
  const [total, setTotal] = useState(initialData.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = enableLoadMore && total > items.length;

  const handleLoadMore = useCallback(async () => {
    if (!enableLoadMore || loading || !hasMore) return;
    setLoading(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const response = await fetchFeed(nextPage, take);
      setItems((prev) => [...prev, ...response.items]);
      setPage(nextPage);
      setTotal(response.total);
    } catch (fetchError) {
      console.error("Failed to load feed page", fetchError);
      setError(
        fetchError instanceof ApiError
          ? fetchError.message ?? "No se pudo cargar el feed"
          : "No se pudo cargar el feed",
      );
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page, take]);

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">
          Todavia no hay actividad. Segui a otros jugadores para ver sus reseas, ratings y listas.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              showMuteButton={showMuteButton}
            />
          ))}
        </div>
      )}

      {error ? (
        <p className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-full border border-border px-6 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Cargando..." : "Cargar mas"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
