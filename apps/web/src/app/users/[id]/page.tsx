"use server";

import { notFound } from "next/navigation";

import { ApiError, apiServer } from "@/lib/api";
import type { ListPaginatedResponse, PaginatedReviews, User, UserSummary } from "@/types";

import { UserProfileContent } from "./user_profile_content";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [summary, reviews, lists, currentUser] = await Promise.all([
    apiServer<UserSummary>(`/users/${id}/summary`).catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        notFound();
      }
      throw error;
    }),
    apiServer<PaginatedReviews>(`/users/${id}/reviews?take=10&skip=0`).catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return { total: 0, items: [] };
      }
      throw error;
    }),
    apiServer<ListPaginatedResponse>(`/lists/public/by-user/${id}?page=1&take=6`).catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return { total: 0, page: 1, take: 6, items: [] };
      }
      throw error;
    }),
    apiServer<User>("/auth/me").catch((error) => {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      console.error("Failed to load current user", error);
      return null;
    }),
  ]);

  return (
    <UserProfileContent
      summary={summary}
      initialReviews={reviews}
      initialLists={lists}
      currentUser={currentUser}
      userId={id}
    />
  );
}
