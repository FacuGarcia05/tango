"use client";

import Image from "next/image";

import type { DailyTangoLeaderboard } from "@/types";

interface DailyLeaderboardProps {
  title: string;
  leaderboard: DailyTangoLeaderboard;
}

export function DailyLeaderboard({ title, leaderboard }: DailyLeaderboardProps) {
  const empty = leaderboard.entries.length === 0;

  return (
    <div className="rounded-3xl border border-border bg-surface/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-text">{title}</h3>
          <p className="text-xs text-text-muted">Ultimos {leaderboard.period_days} dias</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-text-muted">{leaderboard.metric}</span>
      </div>

      {empty ? (
        <p className="mt-4 text-sm text-text-muted">Sin registros todavia.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {leaderboard.entries.map((entry, index) => (
            <li
              key={entry.user.id}
              className="flex items-center justify-between rounded-2xl border border-border/50 bg-bg/60 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-text-muted">#{index + 1}</span>
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border/60 bg-surface/80">
                    {entry.user.avatar_url ? (
                      <Image
                        src={entry.user.avatar_url}
                        alt={entry.user.display_name}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-text">
                        {entry.user.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-text">{entry.user.display_name}</span>
                </div>
              </div>
              <div className="text-right text-xs text-text-muted">
                <div className="text-base font-semibold text-text">{entry.formatted}</div>
                {entry.detail ? <div>{entry.detail}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
