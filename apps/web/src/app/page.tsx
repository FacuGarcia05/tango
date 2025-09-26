import Link from "next/link";
import { cookies } from "next/headers";

import type { User } from "@/types";

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

  if (user) {
    return (
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
    );
  }

  return (
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
}