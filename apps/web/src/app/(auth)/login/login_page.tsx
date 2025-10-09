"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { ApiError, api, API } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? API ?? "";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      setInfo("Tu email fue verificado. Ya podes iniciar sesion.");
    } else if (searchParams.get("registered") === "1") {
      setInfo("Revisa tu email para verificar la cuenta antes de ingresar.");
    } else {
      setInfo(null);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      await refresh();
      const next = searchParams.get("next") ?? "/me";
      router.push(next);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Credenciales invalidas");
      } else {
        setError("Ocurrio un error inesperado");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldShowResend = useMemo(() => (error ?? "").toLowerCase().includes("verific"), [error]);

  const handleResendVerification = async () => {
    if (!email) {
      setError("Ingresa tu email para reenviar la verificacion");
      return;
    }
    try {
      await api("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setInfo("Si el email existe, reenviamos el enlace de verificacion.");
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No se pudo reenviar el email");
      } else {
        setError("No se pudo reenviar el email");
      }
    }
  };

  const handleGoogleLogin = () => {
    const url = API_BASE ? `${API_BASE}/auth/google` : "/auth/google";
    window.location.href = url;
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface/90 p-8 shadow-xl">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Iniciar sesion</h1>
      <p className="mt-2 text-sm text-text-muted">
        No tenes cuenta?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 transition hover:underline">
          Registrate
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder="Tu password"
          />
        </div>

        {info ? <p className="text-sm text-success">{info}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span>Continuar con Google</span>
        </button>

        {shouldShowResend ? (
          <button
            type="button"
            onClick={handleResendVerification}
            className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            disabled={isSubmitting}
          >
            Reenviar verificacion
          </button>
        ) : null}
      </div>
    </div>
  );
}
