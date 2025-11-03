import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApiError } from "@/lib/api";
import { fetchNewsBySlugServer } from "@/lib/news.server";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR", { dateStyle: "long" });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const news = await fetchNewsBySlugServer(slug).catch((error) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  if (!news) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{news.source}</p>
        <h1 className="text-4xl font-bold tracking-tight text-text">{news.title}</h1>
        <p className="text-sm text-text-muted">{formatDate(news.published_at)}</p>
      </div>

      <div className="relative h-64 w-full overflow-hidden rounded-3xl border border-border">
        <Image
          src={news.cover_url ?? "/placeholder-cover.svg"}
          alt={news.title}
          fill
          className="object-cover"
        />
      </div>

      <p className="text-base text-text">{news.excerpt}</p>

      <div>
        <Link
          href={news.source_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast transition hover:opacity-90"
        >
          Ver fuente
        </Link>
      </div>
    </main>
  );
}
