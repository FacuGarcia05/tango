import { apiServer } from "./api";
import type { NewsItem, NewsPaginatedResponse } from "@/types";

export async function fetchNewsServer(page?: number, take?: number) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (take) params.set("take", String(take));

  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return apiServer<NewsPaginatedResponse>(`/news${suffix}`);
}

export async function fetchNewsBySlugServer(slug: string) {
  return apiServer<NewsItem>(`/news/${slug}`);
}

export async function fetchFeaturedNewsServer() {
  return apiServer<NewsItem[]>("/homepage/featured");
}
