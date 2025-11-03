import Image from "next/image";
import Link from "next/link";

import { fetchNewsServer } from "@/lib/news.server";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR", { dateStyle: "medium" });
}

export default async function NewsIndexPage() {
  const response = await fetchNewsServer(1, 12).catch((error) => {
    console.error("Failed to load news list", error);
    return { total: 0, page: 1, take: 12, items: [] };
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Novedades</p>
        <h1 className="text-3xl font-bold tracking-tight text-text">Noticias y lanzamientos</h1>
        <p className="text-sm text-text-muted">
          Mantente al dia con las novedades del mundo gamer: anuncios, trailers y articulos destacados.
        </p>
      </header>

      {response.items.length === 0 ? (
        <p className="text-sm text-text-muted">Todavia no hay noticias disponibles.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {response.items.map((entry) => (
            <article key={entry.id} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface/80 shadow-lg">
              <div className="relative h-48 w-full overflow-hidden border-b border-border">
                <Image
                  src={entry.cover_url ?? "/placeholder-cover.svg"}
                  alt={entry.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <span>{entry.source}</span>
                  <span>{formatDate(entry.published_at)}</span>
                </div>
                <h2 className="text-lg font-semibold text-text">
                  <Link href={`/news/${entry.slug}`} className="transition hover:text-primary">
                    {entry.title}
                  </Link>
                </h2>
                <p className="flex-1 text-sm text-text-muted">{entry.excerpt}</p>
                <Link
                  href={`/news/${entry.slug}`}
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Ver mas
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
