import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ListDetailClient } from "@/components/lists/ListDetailClient";
import { ApiError, apiServer } from "@/lib/api";
import { fetchListBySlugServer } from "@/lib/lists.server";
import type { ListDetail, User } from "@/types";

async function resolveShareUrl(slug: string): Promise<string> {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? headerList.get("x-url-scheme") ?? "https";
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("x-host") ??
    headerList.get("host") ??
    process.env.NEXT_PUBLIC_APP_DOMAIN;

  if (host) {
    return `${proto}://${host}/lists/${slug}`;
  }

  const base = process.env.NEXT_PUBLIC_APP_BASE;
  if (base) {
    return `${base.replace(/\/+$/, "")}/lists/${slug}`;
  }

  return `/lists/${slug}`;
}

export default async function ListDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let list: ListDetail | null = null;
  try {
    list = await fetchListBySlugServer(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  if (!list) {
    notFound();
  }

  let me: User | null = null;
  try {
    me = await apiServer<User>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      me = null;
    } else {
      console.error("Failed to load current user for list detail", error);
    }
  }

  const shareUrl = await resolveShareUrl(slug);
  const isOwner = Boolean(me && me.id === list.owner.id);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 py-10">
      <ListDetailClient initialList={list} isOwner={isOwner} shareUrl={shareUrl} />
    </main>
  );
}
