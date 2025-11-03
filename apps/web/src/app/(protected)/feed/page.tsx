import { FeedList } from "@/components/FeedList";
import { fetchFeedServer } from "@/lib/feed.server";

export default async function FeedPage() {
  const initialFeed = await fetchFeedServer(1, 10).catch((error) => {
    console.error("Failed to load feed", error);
    return { total: 0, page: 1, take: 10, items: [] };
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Actividad</p>
        <h1 className="text-3xl font-bold tracking-tight text-text">Feed personalizado</h1>
        <p className="mt-2 text-sm text-text-muted">
          Enterate cuando las personas que seguis publican resenas, asignan ratings o actualizan sus listas.
        </p>
      </div>

      <FeedList initialData={initialFeed} />
    </main>
  );
}
