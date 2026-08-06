"use client";

/**
 * AuthGuard — wrap protected page content.
 *
 * - `guest`          -> hard redirect to the shell login. Cross-zone, so plain
 *                       `window.location.href` (never `next/link`, whose
 *                       soft-navigation breaks between zones). The redirect runs
 *                       in an effect and `null` is rendered meanwhile.
 * - `checking`       -> lightweight skeleton while the optimistic status
 *                       resolves (a single render tick with the optimistic
 *                       AuthProvider).
 * - `authenticated`  -> render children.
 *
 * Built in PR3; consumed by zone pages in PR4.
 */

import { useEffect } from "react";
import type { ReactNode } from "react";
import { ROUTES } from "../routes";
import { useAuth } from "./use-auth";
import { Skeleton } from "../ui";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  useEffect(() => {
    if (status === "guest" && typeof window !== "undefined") {
      window.location.href = ROUTES.login;
    }
  }, [status]);

  if (status === "guest") return null;

  if (status === "checking") {
    return (
      <div className="flex flex-col gap-2 p-6" aria-busy="true">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return <>{children}</>;
}
