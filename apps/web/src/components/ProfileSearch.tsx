"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { FollowStats, User, UserSearchResponse, UserSearchResult } from "@/types";
import { FollowButton } from "./FollowButton";

interface ProfileSearchProps {
  currentUser: User | null;
}

const PLACEHOLDER_AVATAR = "/avatar-placeholder.png";
const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 10;

export function ProfileSearch({ currentUser }: ProfileSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    if (debouncedQuery.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setTotal(0);
      setError(null);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api<UserSearchResponse>(
          `/users/search?q=${encodeURIComponent(debouncedQuery)}&take=${DEFAULT_LIMIT}`,
          { signal: controller.signal },
        );
        setResults(response.items);
        setTotal(response.total);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof ApiError ? err.message || "No se pudieron cargar los perfiles" : "No se pudieron cargar los perfiles";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setQuery((value) => value.trim());
  };

  const handleFollowChange = useCallback((userId: string, stats: FollowStats) => {
    setResults((prev) =>
      prev.map((item) => (item.id === userId ? { ...item, followers: stats.followers, following: stats.following, isFollowing: stats.isFollowing } : item)),
    );
  }, []);

  const renderResults = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-text-muted">Buscando perfiles...</p>;
    }
    if (error) {
      return <p className="text-sm text-danger">{error}</p>;
    }
    if (!results.length) {
      if (debouncedQuery.trim().length >= MIN_QUERY_LENGTH) {
        return <p className="text-sm text-text-muted">No encontramos perfiles para &quot;{debouncedQuery}&quot;.</p>;
      }
      return <p className="text-sm text-text-muted">Busca jugadores por nombre o email.</p>;
    }

    return (
      <ul className="space-y-3">
        {results.map((user) => {
          const href = `/users/${user.id}`;
          const buttonDisabled = currentUser?.id === user.id;
          return (
            <li key={user.id} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-bg/70 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href={href}
                  className="relative h-12 w-12 overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <Image src={user.avatarUrl || PLACEHOLDER_AVATAR} alt={user.displayName} fill sizes="48px" className="object-cover" />
                </Link>
                <div>
                  <Link
                    href={href}
                    className="text-sm font-semibold text-text transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    {user.displayName}
                  </Link>
                  {user.bio ? <p className="text-xs text-text-muted line-clamp-2">{user.bio}</p> : null}
                  <div className="mt-1 flex gap-2 text-xs text-text-muted">
                    <span>{user.followers} seguidores</span>
                    <span>{user.following} siguiendo</span>
                  </div>
                </div>
              </div>
              <div className="sm:text-right">
                {buttonDisabled ? (
                  <span className="text-xs font-semibold text-text-muted">Este sos vos</span>
                ) : (
                  <FollowButton
                    targetUserId={user.id}
                    initialStats={{
                      followers: user.followers,
                      following: user.following,
                      isFollowing: user.isFollowing ?? false,
                    }}
                    onChange={(stats) => handleFollowChange(user.id, stats)}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }, [currentUser?.id, debouncedQuery, error, handleFollowChange, loading, results]);

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-surface/80 p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-text">Buscar perfiles</h2>
        <p className="text-sm text-text-muted">Encontra jugadores para seguirlos y ver sus resenas.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o email"
          className="w-full rounded-md border border-border bg-bg/80 px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={query.trim().length < MIN_QUERY_LENGTH}
        >
          Buscar
        </button>
      </form>
      {renderResults}
      {total > DEFAULT_LIMIT && results.length ? (
        <p className="text-xs text-text-muted">Mostrando {results.length} de {total} resultados.</p>
      ) : null}
    </section>
  );
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
