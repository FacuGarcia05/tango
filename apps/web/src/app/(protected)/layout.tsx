import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError, apiServer } from "@/lib/api";
import type { User } from "@/types";
import { ProtectedUserProvider } from "@/context/ProtectedUserProvider";

async function resolveCurrentPath(): Promise<string> {
  const headerList = await headers();
  const candidates = [
    headerList.get("next-url"),
    headerList.get("x-invoke-path"),
    headerList.get("x-forwarded-path"),
    headerList.get("x-matched-path"),
  ];

  for (const candidate of candidates) {
    if (!candidate || candidate === "undefined") {
      continue;
    }

    if (candidate.startsWith("http")) {
      try {
        const url = new URL(candidate);
        return `${url.pathname}${url.search}` || "/";
      } catch {
        continue;
      }
    } else {
      return candidate;
    }
  }

  return "/";
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPath = await resolveCurrentPath();

  try {
    const user = await apiServer<User>("/auth/me");

    if (!user) {
      redirect(`/login?next=${encodeURIComponent(currentPath)}`);
    }

    return (
      <ProtectedUserProvider user={user}>
        {children}
      </ProtectedUserProvider>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(currentPath)}`);
    }

    throw error;
  }
}
