"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const { refresh, setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      await refresh();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={`rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      disabled={loading}
    >
      {loading ? "Cerrando sesion..." : "Cerrar sesion"}
    </button>
  );
}
