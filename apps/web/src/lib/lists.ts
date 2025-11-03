import { api } from "./api";
import type { AddListItemDto, CreateListDto, UpdateListDto } from "./lists.types";
import type { ListDetail, ListSummary } from "@/types";
import type { ListItem } from "@/types";

export async function fetchMyLists(): Promise<ListSummary[]> {
  return api<ListSummary[]>("/lists/me");
}

export async function fetchListBySlug(slug: string): Promise<ListDetail> {
  return api<ListDetail>(`/lists/${slug}`);
}

export async function createList(dto: CreateListDto): Promise<ListSummary> {
  return api<ListSummary>("/lists", {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export async function updateList(slug: string, dto: UpdateListDto): Promise<ListDetail> {
  return api<ListDetail>(`/lists/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function deleteList(slug: string): Promise<void> {
  await api(`/lists/${slug}`, { method: "DELETE" });
}

export async function addItemToList(slug: string, gameSlug: string, note?: string | null) {
  return api<ListItem>(`/lists/${slug}/items`, {
    method: "POST",
    body: JSON.stringify({ gameSlug, note: note ?? undefined } satisfies AddListItemDto),
  });
}

export async function removeItemFromList(slug: string, gameSlug: string) {
  await api(`/lists/${slug}/items/${gameSlug}`, {
    method: "DELETE",
  });
}

export async function reorderListItems(
  slug: string,
  items: Array<{ gameId: string; position: number }>,
) {
  return api<ListDetail>(`/lists/${slug}/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ items }),
  });
}

