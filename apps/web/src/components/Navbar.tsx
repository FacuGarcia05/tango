"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Juegos" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refresh, setUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      await refresh();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const renderAuthActions = () => {
    if (loading) {
      return <span className="text-sm text-slate-500">Verificando sesion...</span>;
    }

    if (user) {
      return (
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-slate-700 sm:inline">
            {user.displayName || user.email}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white shadow transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-75"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Saliendo..." : "Logout"}
          </button>
          <Link
            href="/me"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Ver perfil"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5Zm0 2c-4.971 0-9 3.134-9 7 0 .552.448 1 1 1h16c.552 0 1-.448 1-1 0-3.866-4.029-7-9-7Z" />
            </svg>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 text-sm font-medium">
        <Link
          href="/login"
          className="text-slate-700 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-white shadow transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Registrarse
        </Link>
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Tango
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    isActive
                      ? "text-slate-900"
                      : "transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        {renderAuthActions()}
      </div>
    </nav>
  );
}
