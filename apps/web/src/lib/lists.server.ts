import { apiServer } from "./api";
import type { ListDetail, ListPaginatedResponse, ListSummary } from "@/types";

export async function fetchMyListsServer(): Promise<ListSummary[]> {
  return apiServer<ListSummary[]>("/lists/me");
}

export async function fetchListBySlugServer(slug: string): Promise<ListDetail> {
  return apiServer<ListDetail>(`/lists/${slug}`);
}

export async function fetchPublicListsByUserServer(
  userId: string,
  page?: number,
  take?: number,
): Promise<ListPaginatedResponse> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (take) params.set("take", String(take));

  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  return apiServer<ListPaginatedResponse>(`/lists/public/by-user/${userId}${suffix}`);
}
