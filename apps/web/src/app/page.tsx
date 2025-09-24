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
      <section className="space-y-8 rounded-lg bg-white p-10 shadow">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tu espacio gamer</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Hola, {user.displayName || user.email} <span aria-hidden>{"\u{1F44B}"}</span>
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Listo para continuar explorando nuevos mundos y aventuras? Segui descubriendo juegos, listas y resenas en Tango.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/games"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Continuar explorando
          </Link>
          <Link
            href="/me"
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Ver mi perfil
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8 rounded-lg bg-white p-10 shadow">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Bienvenido a Tango
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Descubri, lista y comenta tus videojuegos favoritos. Explora el catalogo completo, segui a tus amistades y mantenete al dia con tu backlog gamer.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/register"
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Iniciar sesion
        </Link>
        <Link
          href="/games"
          className="text-sm font-semibold text-slate-700 underline-offset-4 transition hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Ver catalogo
        </Link>
      </div>
    </section>
  );
}
