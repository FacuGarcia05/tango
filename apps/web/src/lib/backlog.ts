import { api } from "./api";
import type {
  BacklogContainsResponse,
  BacklogListResponse,
  BacklogMutationResponse,
} from "@/types";

export async function fetchBacklog(): Promise<BacklogListResponse> {
  return api<BacklogListResponse>("/backlog");
}

export async function addToBacklog(gameSlug: string): Promise<BacklogMutationResponse> {
  return api<BacklogMutationResponse>(`/backlog/${gameSlug}`, { method: "POST" });
}

export async function removeFromBacklog(gameSlug: string): Promise<BacklogMutationResponse> {
  return api<BacklogMutationResponse>(`/backlog/${gameSlug}`, { method: "DELETE" });
}

export async function checkBacklog(gameSlug: string): Promise<BacklogContainsResponse> {
  return api<BacklogContainsResponse>(`/backlog/contains/${gameSlug}`);
}

