import { ApiError, apiServer } from "@/lib/api";
import type { DailyTangoLeaderboard, DailyTangoSummary } from "@/types";

import { DailyTangoPage } from "./daily_tango_page";

async function fetchLeaderboard(mode: "word" | "memory" | "reaction") {
  return apiServer<DailyTangoLeaderboard>(`/daily-tango/leaderboard?mode=${mode}`).catch(() => {
    const fallback: DailyTangoLeaderboard = {
      mode,
      period_days: 7,
      metric: mode === "reaction" ? "ms" : "pts",
      direction: mode === "reaction" ? "asc" : "desc",
      entries: [],
    };
    return fallback;
  });
}

export default async function DailyTangoRoute() {
  let summary: DailyTangoSummary;
  try {
    summary = await apiServer<DailyTangoSummary>("/daily-tango/today");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // El layout protegido redirigira si no hay sesion, pero dejamos un fallback.
      throw error;
    }
    throw error;
  }

  const [word, memory, reaction] = await Promise.all([
    fetchLeaderboard("word"),
    fetchLeaderboard("memory"),
    fetchLeaderboard("reaction"),
  ]);

  return <DailyTangoPage summary={summary} leaderboards={{ word, memory, reaction }} />;
}
