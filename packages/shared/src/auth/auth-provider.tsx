"use client";

/**
 * AuthProvider — optimistic session-state holder.
 *
 * The session cookie is HttpOnly, so it cannot be read from JS and the backend
 * exposes no `/auth/me` endpoint to probe. The provider therefore starts in
 * `checking` and optimistically transitions to `authenticated` on mount: a page
 * that loads is treated as authenticated until a 401 proves otherwise. When any
 * apiClient call receives a 401, the session singleton fires and this provider
 * flips to `guest` (the blocking modal is rendered by <SessionExpiredProvider>).
 *
 * - `login(username, password)` calls `apiClient.auth.login`; it THROWS on
 *   failure so the login form can surface the backend error, and on success it
 *   calls `resetSessionExpired()` (so the modal does not reappear after
 *   re-login) before becoming `authenticated`.
 * - `logout()` calls `apiClient.auth.logout` (tolerating failures) and becomes
 *   `guest`.
 *
 * State is NOT synchronized across zones: each zone is a separate Next app with
 * its own provider tree, which is intentional by design.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiClient } from "../api/client";
import { resetSessionExpired, subscribeSessionExpired } from "./session";
import type { AuthStatus } from "../types";
import { AuthContext, type AuthContextValue } from "./use-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");

  // Optimistic assumption: a page that mounts is authenticated until a 401
  // arrives. There is no cookie to read and no /auth/me to call.
  useEffect(() => {
    setStatus("authenticated");
  }, []);

  // Flip to `guest` whenever any apiClient call raises a session expiry (401).
  useEffect(() => {
    const unsubscribe = subscribeSessionExpired((expired) => {
      if (expired) setStatus("guest");
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    // Throws ApiError on failure; the form catches and displays it.
    await apiClient.auth.login(username, password);
    resetSessionExpired();
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.auth.logout();
    } catch {
      // Even if the server call fails, drop the session locally and let the
      // caller redirect to login.
    }
    setStatus("guest");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, login, logout }),
    [status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
