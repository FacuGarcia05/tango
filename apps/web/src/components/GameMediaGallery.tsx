"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { GameMediaItem } from "@/types";

interface GameMediaGalleryProps {
  items: GameMediaItem[];
}

function buildEmbedUrl(item: GameMediaItem, host: string) {
  if (item.type !== "video") {
    return item.url;
  }

  if (item.provider === "youtube" && item.provider_id) {
    return `https://www.youtube.com/embed/${item.provider_id}`;
  }

  if (item.provider === "twitch" && item.provider_id) {
    const isClip = item.url.includes("clips.twitch.tv");
    if (isClip) {
      return `https://clips.twitch.tv/embed?clip=${item.provider_id}&parent=${host}`;
    }
    return `https://player.twitch.tv/?video=${item.provider_id}&parent=${host}&autoplay=false`;
  }

  return item.url;
}

function videoLabel(provider?: string | null) {
  if (!provider) return "Clip";
  if (provider === "youtube") return "YouTube";
  if (provider === "twitch") return "Twitch";
  return provider;
}

export function GameMediaGallery({ items }: GameMediaGalleryProps) {
  const [selected, setSelected] = useState<GameMediaItem | null>(null);
  const [host, setHost] = useState("localhost");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.hostname) {
      setHost(window.location.hostname);
    }
  }, []);

  const embedUrl = useMemo(() => {
    if (!selected) return null;
    return buildEmbedUrl(selected, host);
  }, [selected, host]);

  const empty = items.length === 0;

  return (
    <div className="space-y-4">
      {empty ? (
        <p className="text-sm text-text-muted">Todavia no hay aportes de la comunidad.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-surface/60 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {item.type === "image" ? (
                <Image
                  src={item.url}
                  alt="Captura subida por la comunidad"
                  width={640}
                  height={360}
                  className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-40 w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30 text-sm font-semibold text-text">
                  <span className="rounded-full bg-primary/20 px-3 py-1 text-xs uppercase tracking-wide text-primary">
                    {videoLabel(item.provider)}
                  </span>
                  <span className="mt-2 text-text">Ver clip</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-bg/90 via-bg/30 to-transparent p-3 text-left text-xs text-primary-contrast">
                {item.user?.display_name ? (
                  <span className="font-semibold">{item.user.display_name}</span>
                ) : (
                  <span className="italic text-text-muted">Anonimo</span>
                )}
                <span className="ml-2 text-[11px] uppercase tracking-wide text-text-muted">
                  {item.type === "image" ? "Captura" : "Clip"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-3xl bg-surface p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 rounded-full border border-border/80 bg-surface/80 px-3 py-1 text-sm text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Cerrar
            </button>
            {selected.type === "image" ? (
              <Image
                src={selected.url}
                alt="Captura en grande"
                width={1280}
                height={720}
                className="h-auto w-full rounded-2xl object-contain"
              />
            ) : embedUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={embedUrl}
                  className="h-full w-full rounded-2xl border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Clip de la comunidad"
                />
              </div>
            ) : (
              <p className="text-sm text-text-muted">No pudimos abrir este clip.</p>
            )}
            {selected.user?.display_name ? (
              <p className="mt-3 text-sm text-text-muted">
                Compartido por <span className="font-medium text-text">{selected.user.display_name}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
