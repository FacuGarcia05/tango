"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });

      await refresh();
      router.push("/me");
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
    <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Crear cuenta</h1>
      <p className="mt-2 text-sm text-slate-600">
        Ya tenes cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-slate-900 underline hover:text-slate-700"
        >
          Ingresar
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-slate-800">
            Nombre a mostrar
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="nickname"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Tu nombre publico"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-800">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-800">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Minimo 8 caracteres"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-75"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creando cuenta..." : "Registrarse"}
        </button>
      </form>
    </div>
  );
}
