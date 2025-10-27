import Link from "next/link";

import { MyListsManager } from "@/components/MyListsManager";
import { fetchMyListsServer } from "@/lib/lists.server";

export default async function MyListsPage() {
  const lists = await fetchMyListsServer().catch((error) => {
    console.error("Failed to load user lists", error);
    return [];
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Mis listas</p>
          <h1 className="text-3xl font-bold tracking-tight text-text">Gestionar listas</h1>
          <p className="mt-2 text-sm text-text-muted">
            Crea, publica o elimina tus colecciones personalizadas. Tu backlog se mantiene siempre privado.
          </p>
        </div>
        <Link
          href="/lists/new"
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Nueva lista
        </Link>
      </div>

      <MyListsManager initialLists={lists} />
    </main>
  );
}
