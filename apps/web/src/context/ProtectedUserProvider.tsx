"use client";

import { createContext, useContext } from "react";

import type { User } from "@/types";

const ProtectedUserContext = createContext<User | null>(null);

export function ProtectedUserProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return <ProtectedUserContext.Provider value={user}>{children}</ProtectedUserContext.Provider>;
}

export function useProtectedUser() {
  const user = useContext(ProtectedUserContext);
  if (!user) {
    throw new Error("useProtectedUser must be used within ProtectedUserProvider");
  }
  return user;
}
