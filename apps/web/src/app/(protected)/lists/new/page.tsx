import Link from "next/link";

import { CreateListForm } from "@/components/CreateListForm";

export default function NewListPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Listas</p>
          <h1 className="text-3xl font-bold tracking-tight text-text">Crear nueva lista</h1>
          <p className="mt-2 text-sm text-text-muted">
            Agrupa tus juegos favoritos y compartilos con la comunidad. Siempre podes editarla mas tarde.
          </p>
        </div>
        <Link
          href="/me/lists"
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Mis listas
        </Link>
      </div>

      <CreateListForm />
    </main>
  );
}
