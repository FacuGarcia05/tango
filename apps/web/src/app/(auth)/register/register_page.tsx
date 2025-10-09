"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });

      setSuccess("Registro exitoso. Te enviamos un email de verificacion.");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setTimeout(() => {
        router.push("/login?registered=1");
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No se pudo registrar");
      } else {
        setError("Ocurrio un error inesperado");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface/90 p-8 shadow-xl">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Crear cuenta</h1>
      <p className="mt-2 text-sm text-text-muted">
        Ya tenes cuenta?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 transition hover:underline">
          Ingresar
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-text">
            Nombre a mostrar
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="nickname"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder="Tu nombre publico"
            minLength={3}
          />
        </div>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder="Minimo 6 caracteres"
            minLength={6}
          />
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {success ? <p className="text-sm text-success">{success}</p> : null}

        <button
          type="submit"
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creando cuenta..." : "Registrarse"}
        </button>
      </form>
    </div>
  );
}
