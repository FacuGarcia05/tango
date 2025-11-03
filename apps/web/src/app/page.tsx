import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { FeedList } from "@/components/FeedList";
import { fetchFeedServer } from "@/lib/feed.server";
import { fetchFeaturedNewsServer } from "@/lib/news.server";
import type { FeedResponse, User } from "@/types";

async function getCurrentUser(): Promise<User | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  if (!apiBase) {
    return null;
  }

  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();

  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  try {
    const response = await fetch(`${apiBase}/auth/me`, {
      headers,
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as User;
  } catch {
    return null;
  }
}

export default async function Home() {
  const user = await getCurrentUser();

  const [featuredNews, feedData] = await Promise.all([
    fetchFeaturedNewsServer().catch((error) => {
      console.error("Failed to load featured news", error);
      return [];
    }),
    user
      ? fetchFeedServer(1, 5).catch((error) => {
          console.error("Failed to load feed", error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const mockFeed: FeedResponse = {
    total: 3,
    page: 1,
    take: 5,
    items: [
      {
        id: "mock-activity-1",
        verb: "list:publish",
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        actor: { id: "mock-user-1", display_name: "Lautaro", avatar_url: null },
        object_type: "list",
        object_id: null,
        metadata: { list_slug: "indies-imprescindibles", list_title: "Indies imprescindibles" },
        payload: {
          list: {
            id: "mock-list-1",
            slug: "indies-imprescindibles",
            title: "Indies imprescindibles",
            description: "Tres joyitas para empezar.",
            is_public: true,
            is_backlog: false,
            created_at: undefined,
            updated_at: undefined,
            items_count: 3,
          },
        },
      },
      {
        id: "mock-activity-2",
        verb: "review:create",
        created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        actor: { id: "mock-user-2", display_name: "Maru", avatar_url: null },
        object_type: "review",
        object_id: null,
        metadata: { game_slug: "the-witcher-3" },
        payload: {
          game: {
            id: "mock-game-w3",
            slug: "the-witcher-3",
            title: "The Witcher 3",
            cover_url:
              "https://image.api.playstation.com/vulcan/ap/rnd/202211/0711/kh4MUIuMmHlktOHar3lVl6rY.png",
          },
          review: {
            id: "mock-review-1",
            title: "Una aventura inolvidable",
            has_spoilers: false,
            excerpt: "El mejor mundo abierto para perderse durante semanas sin mirar el reloj.",
          },
        },
      },
      {
        id: "mock-activity-3",
        verb: "list:add",
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        actor: { id: "mock-user-3", display_name: "Cami", avatar_url: null },
        object_type: "list",
        object_id: null,
        metadata: { list_slug: "metroidvania-favoritos", list_title: "Metroidvania favoritos" },
        payload: {
          game: {
            id: "mock-game-hk",
            slug: "hollow-knight",
            title: "Hollow Knight",
            cover_url:
              "https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Hollow_Knight_first_cover_art.webp/250px-Hollow_Knight_first_cover_art.webp.png",
          },
        },
      },
    ],
  };

  const feedInitial = feedData && feedData.items.length ? feedData : mockFeed;
  const feedEnableLoadMore =
    Boolean(user) && Boolean(feedData && feedData.total > feedData.items.length);

  const hero = user ? (
    <section className="space-y-8 rounded-3xl border border-border bg-surface/90 p-10 shadow-xl">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">Tu espacio gamer</p>
        <h1 className="text-4xl font-bold tracking-tight text-text">
          Hola, {user.displayName || user.email} <span aria-hidden>{"\u{1F44B}"}</span>
        </h1>
        <p className="max-w-2xl text-lg text-text-muted">
          Listo para continuar explorando nuevos mundos y aventuras? Segui descubriendo juegos, listas y resenas en Tango.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/games"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Continuar explorando
        </Link>
        <Link
          href="/me"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Ver mi perfil
        </Link>
      </div>
    </section>
  ) : (
    <section className="space-y-8 rounded-3xl border border-border bg-surface/90 p-10 shadow-xl">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-text">Bienvenido a Tango</h1>
        <p className="max-w-2xl text-lg text-text-muted">
          Descubri, lista y comenta tus videojuegos favoritos. Explora el catalogo completo, segui a tus amistades y mantenete al dia con tu backlog gamer.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/register"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Iniciar sesion
        </Link>
        <Link
          href="/games"
          className="text-sm font-semibold text-primary underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Ver catalogo
        </Link>
      </div>
    </section>
  );

  return (
    <div className="space-y-12">
      {hero}

      <section className="space-y-4 rounded-3xl border border-border bg-surface/80 p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Actividad</p>
            <h2 className="text-2xl font-bold text-text">
              {user ? "Lo mas reciente de tus seguidos" : "Asi se ve el feed de Tango"}
            </h2>
          </div>
          <Link
            href="/feed"
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary"
          >
            Ir al feed
          </Link>
        </div>
        <FeedList
          initialData={feedInitial}
          showMuteButton={Boolean(user)}
          enableLoadMore={feedEnableLoadMore}
        />
      </section>

      {featuredNews.length ? (
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Destacados de la semana</p>
              <h2 className="text-2xl font-bold text-text">Lo mas reciente</h2>
            </div>
            <Link
              href="/news"
              className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary"
            >
              Ver todas
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredNews.map((entry) => (
              <article
                key={entry.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface/80 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <Image
                  src={entry.cover_url ?? "/placeholder-cover.svg"}
                  alt={entry.title}
                  width={640}
                  height={320}
                  className="h-40 w-full border-b border-border object-cover"
                />
                <div className="space-y-2 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{entry.source}</p>
                  <h3 className="text-base font-semibold text-text">
                    <Link href={`/news/${entry.slug}`} className="transition hover:text-primary">
                      {entry.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-text-muted">{entry.excerpt}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
