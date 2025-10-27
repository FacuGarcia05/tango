import { api, apiServer } from "./api";
import type { NewsItem, NewsPaginatedResponse } from "@/types";

export async function fetchNews(page?: number, take?: number) {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (take) params.set("take", String(take));

  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return apiServer<NewsPaginatedResponse>(`/news${suffix}`);
}

export async function fetchNewsBySlug(slug: string) {
  return apiServer<NewsItem>(`/news/${slug}`);
}

export async function fetchFeaturedNews() {
  return apiServer<NewsItem[]>("/homepage/featured");
}

export async function createNews(payload: Partial<NewsItem>) {
  return api<NewsItem>("/news", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateNews(slug: string, payload: Partial<NewsItem>) {
  return api<NewsItem>(`/news/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteNews(slug: string) {
  await api(`/news/${slug}`, { method: "DELETE" });
}
