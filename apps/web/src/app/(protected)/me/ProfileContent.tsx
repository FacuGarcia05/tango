"use client";

import { LogoutButton } from "@/components/LogoutButton";
import { useProtectedUser } from "@/context/ProtectedUserProvider";

export function ProfileContent() {
  const user = useProtectedUser();

  return (
    <section className="space-y-6 rounded-lg bg-white p-8 shadow">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Hola, {user.displayName || user.email}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Este es tu perfil dentro de Tango.
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4">
          <dt className="font-medium text-gray-500">Email</dt>
          <dd className="mt-1 font-mono text-gray-900">{user.email}</dd>
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <dt className="font-medium text-gray-500">Nombre a mostrar</dt>
          <dd className="mt-1 font-medium text-gray-900">
            {user.displayName || "Sin definir"}
          </dd>
        </div>
      </dl>

      <LogoutButton />
    </section>
  );
}
