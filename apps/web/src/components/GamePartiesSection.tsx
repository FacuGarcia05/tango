"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { PartySummary, PartyStatus, User } from "@/types";

interface GamePartiesSectionProps {
  slug: string;
  initialParties: PartySummary[];
  currentUser: User | null;
}

const STATUS_LABEL: Record<PartyStatus, string> = {
  open: "Abierta",
  full: "Completa",
  closed: "Cerrada",
  cancelled: "Cancelada",
};

const PLATFORM_OPTIONS = [
  { value: "PC", label: "PC" },
  { value: "PlayStation 5", label: "PlayStation 5" },
  { value: "Xbox Series", label: "Xbox Series" },
  { value: "Nintendo Switch", label: "Nintendo Switch" },
  { value: "Steam Deck", label: "Steam Deck" },
  { value: "Crossplay", label: "Crossplay / Abierta" },
];

const TIME_OPTIONS = [
  { value: "GMT-3 (noche)", label: "GMT-3 · Noche (AR/CL/UY)" },
  { value: "GMT-3 (tarde)", label: "GMT-3 · Tarde" },
  { value: "GMT-5 (noche)", label: "GMT-5 · Noche (CO/PE)" },
  { value: "GMT-6 (tarde)", label: "GMT-6 · Tarde (MX)" },
  { value: "GMT-1 (noche)", label: "GMT-1 · Noche (ES/PT)" },
  { value: "Fin de semana", label: "Fines de semana" },
];

export function GamePartiesSection({ slug, initialParties, currentUser }: GamePartiesSectionProps) {
  const router = useRouter();
  const [parties, setParties] = useState(initialParties);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ platform: "", timezone: "", capacity: 4, description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyPartyId, setBusyPartyId] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string | null>>({});

  const filteredParties = useMemo(() => {
    if (!filter.trim()) return parties;
    const query = filter.trim().toLowerCase();
    return parties.filter((party) => {
      const haystack = [
        party.platform ?? "",
        party.timezone ?? "",
        party.description ?? "",
        party.host?.display_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [parties, filter]);

  const refreshParties = async () => {
    try {
      const next = await api<PartySummary[]>(`/games/${slug}/parties`);
      setParties(next);
    } catch (err) {
      console.error("No se pudieron refrescar las parties", err);
    }
  };

  const handleCreate = async () => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (!form.platform.trim() || !form.timezone.trim()) {
      setError("Completa plataforma y zona horaria");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const payload = await api<PartySummary>(`/games/${slug}/parties`, {
        method: "POST",
        body: JSON.stringify({
          platform: form.platform.trim(),
          timezone: form.timezone.trim(),
          capacity: form.capacity,
          description: form.description.trim(),
        }),
      });
      setParties((prev) => [payload, ...prev]);
      setForm({ platform: "", timezone: "", capacity: 4, description: "" });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "No se pudo crear la party");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo crear la party");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (partyId: string) => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    setBusyPartyId(partyId);
    setActionErrors((prev) => ({ ...prev, [partyId]: null }));
    try {
      const updated = await api<PartySummary>(`/parties/${partyId}/join`, { method: "POST" });
      setParties((prev) => prev.map((party) => (party.id === partyId ? updated : party)));
      await refreshParties();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionErrors((prev) => ({ ...prev, [partyId]: err.message || "No se pudo unir" }));
      } else {
        setActionErrors((prev) => ({ ...prev, [partyId]: "No se pudo unir" }));
      }
    } finally {
      setBusyPartyId(null);
    }
  };

  const handleClose = async (partyId: string) => {
    if (!currentUser) return;
    setBusyPartyId(partyId);
    setActionErrors((prev) => ({ ...prev, [partyId]: null }));
    try {
      const updated = await api<PartySummary>(`/parties/${partyId}/close`, { method: "POST" });
      setParties((prev) => prev.map((party) => (party.id === partyId ? updated : party)));
    } catch (err) {
      if (err instanceof ApiError) {
        setActionErrors((prev) => ({ ...prev, [partyId]: err.message || "No se pudo cerrar" }));
      } else {
        setActionErrors((prev) => ({ ...prev, [partyId]: "No se pudo cerrar" }));
      }
    } finally {
      setBusyPartyId(null);
    }
  };

  const handleDelete = async (partyId: string) => {
    if (!currentUser) return;
    setBusyPartyId(partyId);
    setActionErrors((prev) => ({ ...prev, [partyId]: null }));
    try {
      await api(`/parties/${partyId}`, { method: "DELETE" });
      setParties((prev) => prev.filter((party) => party.id !== partyId));
    } catch (err) {
      if (err instanceof ApiError) {
        setActionErrors((prev) => ({ ...prev, [partyId]: err.message || "No se pudo eliminar" }));
      } else {
        setActionErrors((prev) => ({ ...prev, [partyId]: "No se pudo eliminar" }));
      }
    } finally {
      setBusyPartyId(null);
    }
  };

  const isMember = (party: PartySummary) => {
    if (!currentUser) return false;
    return party.members.some((member) => member.user?.id === currentUser.id);
  };

  const availableSlots = (party: PartySummary) => {
    return Math.max(0, party.capacity - (party.member_count ?? 0));
  };

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-surface/70 p-6 shadow-lg">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">Parties para este juego</h2>
          <p className="text-sm text-text-muted">
            Coordiná sesiones con otros jugadores. Cuando se llena la party, el anfitrion puede cerrarla.
          </p>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Buscar por plataforma o zona..."
          className="mt-2 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none transition placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 sm:mt-0 sm:w-64"
        />
      </header>

      {currentUser ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-bg/40 p-4">
            <h3 className="text-sm font-semibold text-text">Crear una party</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Plataforma preferida
                <select
                  value={form.platform}
                  onChange={(event) => setForm((prev) => ({ ...prev, platform: event.target.value }))}
                  className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
                  disabled={creating}
                >
                  <option value="">Seleccionar plataforma</option>
                  {PLATFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Zona horaria / momento
                <select
                  value={form.timezone}
                  onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                  className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
                  disabled={creating}
                >
                  <option value="">Seleccionar franja</option>
                  {TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                Cantidad de jugadores
                <input
                  type="number"
                  min={2}
                  max={16}
                  value={form.capacity}
                  onChange={(event) => setForm((prev) => ({ ...prev, capacity: Number(event.target.value) }))}
                  className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
                  disabled={creating}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-text-muted md:col-span-2">
                Descripcion o reglas
                <input
                  type="text"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Discord, requisitos o links de apoyo"
                  className="rounded-md border border-border bg-transparent px-3 py-2 text-sm text-text outline-none transition placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60"
                  disabled={creating}
                />
              </label>
            </div>
            {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCreate}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={creating}
              >
                {creating ? "Creando..." : "Crear party"}
              </button>
              <button
                type="button"
                onClick={refreshParties}
                className="text-xs font-semibold uppercase tracking-wide text-text-muted transition hover:text-primary"
                disabled={creating}
              >
                Actualizar lista
              </button>
            </div>
          </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border/70 bg-bg/40 p-4 text-sm text-text-muted">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Inicia sesion
          </Link>{" "}
          para crear o unirte a una party.
        </p>
      )}

      <div className="space-y-4">
        {filteredParties.length === 0 ? (
          <p className="text-sm text-text-muted">Todavia no hay grupos activos.</p>
        ) : (
          filteredParties.map((party) => {
            const seats = availableSlots(party);
            const host = currentUser && party.host_user_id === currentUser.id;
            const member = isMember(party);
            const statusLabel = STATUS_LABEL[party.status];
            const canJoin = !host && !member && party.status === "open" && seats > 0;
            return (
              <div
                key={party.id}
                className="rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-sm transition hover:border-primary/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-text">
                      {party.platform || "Sin plataforma"}
                      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        {party.timezone || "Horario a coordinar"}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted">
                      Host:{" "}
                      {party.host?.display_name ? (
                        <span className="font-medium text-text">
                          {party.host.display_name}
                          {host ? " (vos)" : ""}
                        </span>
                      ) : (
                        "Anonimo"
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                    <span
                      className={
                        party.status === "open"
                          ? "rounded-full bg-success/20 px-3 py-1 text-success"
                          : party.status === "full"
                            ? "rounded-full bg-warning/20 px-3 py-1 text-warning"
                            : "rounded-full bg-text/10 px-3 py-1 text-text-muted"
                      }
                    >
                      {statusLabel}
                    </span>
                    <span className="rounded-full border border-border px-3 py-1 text-text">
                      {party.member_count}/{party.capacity} lugares
                    </span>
                  </div>
                </div>

                {party.description ? (
                  <p className="mt-2 text-sm text-text">{party.description}</p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                  {party.members.map((memberItem) => (
                    <span
                      key={memberItem.id}
                      className="rounded-full border border-border px-3 py-1 text-text"
                    >
                      {memberItem.user?.display_name ?? "Jugador"}
                      {memberItem.user?.id === currentUser?.id ? " (vos)" : ""}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {canJoin ? (
                    <button
                      type="button"
                      onClick={() => handleJoin(party.id)}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-contrast shadow transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busyPartyId === party.id}
                    >
                      {busyPartyId === party.id ? "Uniendote..." : `Unirme (${seats} libres)`}
                    </button>
                  ) : null}

                  {host && party.status !== "closed" ? (
                    <button
                      type="button"
                      onClick={() => handleClose(party.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-text transition hover:border-danger hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busyPartyId === party.id}
                    >
                      {busyPartyId === party.id ? "Actualizando..." : "Cerrar party"}
                    </button>
                  ) : null}

                  {host && party.status === "closed" ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(party.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-danger transition hover:border-danger hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={busyPartyId === party.id}
                    >
                      {busyPartyId === party.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  ) : null}

                  {!canJoin && !host && !member && party.status === "open" && seats === 0 ? (
                    <span className="text-xs text-text-muted">No hay lugares disponibles.</span>
                  ) : null}
                </div>
                {actionErrors[party.id] ? (
                  <p className="mt-2 text-sm text-danger">{actionErrors[party.id]}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
