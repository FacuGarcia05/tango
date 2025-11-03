import { api, apiServer } from "./api";
import type { FeedResponse } from "@/types";

export async function fetchFeed(page?: number, take?: number) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (take) params.set("take", String(take));

  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return apiServer<FeedResponse>(`/feed${suffix}`);
}

export async function muteUser(userId: string, minutes?: number) {
  return api<{ muted: boolean; until: string }>(`/feed/mute/${userId}`, {
    method: "POST",
    body: JSON.stringify(minutes ? { minutes } : {}),
  });
}

export async function unmuteUser(userId: string) {
  return api<{ muted: boolean }>(`/feed/mute/${userId}`, { method: "DELETE" });
}
