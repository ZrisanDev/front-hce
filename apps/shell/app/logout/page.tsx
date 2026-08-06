"use client";

/**
 * Shell logout route.
 *
 * Calls `useAuth().logout` (which POSTs `/api/auth/logout` from the browser so
 * the HttpOnly cookie travels same-origin) and then hard-redirects to the shell
 * login. The cookie cannot be cleared reliably from a server route handler, so
 * this is a small Client Component page rather than a route handler.
 */

import { useEffect } from "react";
import { ROUTES, useAuth } from "@hce/shared";

export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await logout();
      if (!cancelled) window.location.href = ROUTES.login;
    })();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  return (
    <div className="flex min-h-[calc(100vh-49px)] items-center justify-center px-6">
      <p className="text-sm text-muted-foreground">Cerrando sesión…</p>
    </div>
  );
}
