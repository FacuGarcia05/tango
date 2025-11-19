"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Juegos" },
  { href: "/daily-tango", label: "Daily TANGO" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refresh, setUser, isVerified } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const initials = useMemo(() => {
    if (!user) return "?";
    const source = user.displayName || user.email;
    return source.trim().charAt(0).toUpperCase() || "?";
  }, [user]);

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
      return <span className="text-sm text-text-muted">Verificando sesion...</span>;
    }

    if (user) {
      return (
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-text-muted">{user.displayName || user.email}</span>
            {!isVerified ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-danger">Email sin verificar</span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Saliendo..." : "Logout"}
          </button>
          <Link
            href="/me"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-surface ring-2 ring-primary/20 transition hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Ver perfil"
          >
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName || user.email}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-text">{initials}</span>
            )}
          </Link>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 text-sm font-medium">
        <Link
          href="/login"
          className="rounded-md border border-border px-3 py-1.5 text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-primary px-3 py-1.5 text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Registrarse
        </Link>
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Tango
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-text-muted">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    isActive
                      ? "text-text"
                      : "transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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

