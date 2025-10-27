import { apiServer } from "./api";
import type { FeedResponse } from "@/types";

export async function fetchFeedServer(page?: number, take?: number) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (take) params.set("take", String(take));

  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return apiServer<FeedResponse>(`/feed${suffix}`);
}
