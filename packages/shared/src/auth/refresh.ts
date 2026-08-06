/**
 * Refresh-token singleton (pure module state, no React).
 *
 * The back-hce auth flow (#150) now issues a short-lived access token
 * (`auth_token`, 15 min) plus a rotating refresh token (`refresh_token`,
 * 7 days) as HttpOnly cookies. When an apiClient call gets a 401 (access token
 * expired), we transparently attempt ONE refresh against `POST /api/auth/refresh`
 * before giving up and surfacing the session-expired modal.
 *
 * This module owns a single in-flight refresh promise so that many concurrent
 * 401s (e.g. a dashboard firing several requests at once) share the SAME
 * refresh round-trip instead of stampeding the refresh endpoint. The first 401
 * kicks off the refresh; every other caller awaits the very same promise.
 *
 * CRITICAL: `tryRefresh` calls `fetch` DIRECTLY — it must NEVER go through the
 * `req()` helper in `api/client.ts`. Routing the refresh through `req` would
 * turn a failed refresh (401/403) back into another refresh attempt, looping
 * forever. The refresh is the terminal call of the 401 recovery path.
 *
 * The `refresh_token` cookie is HttpOnly, so it cannot be read from JS; it
 * travels automatically because we send `credentials: "include"`.
 */

let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt a single token refresh. Dedupes concurrent callers against one shared
 * promise.
 *
 * @returns `true` when the refresh succeeded (HTTP 200, new cookies set);
 *          `false` on any failure — 401 (invalid/expired/revoked refresh
 *          token), 403 (reuse detected → family revoked), or a network error.
 */
export function tryRefresh(): Promise<boolean> {
  // Dedup: if a refresh is already in flight, every caller awaits the same one.
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include", // sends the refresh_token cookie automatically
      });
      return res.ok; // true on 200, false on 401/403/other
    } catch {
      return false; // network error / fetch threw
    } finally {
      refreshPromise = null; // clear so the next 401 starts a fresh cycle
    }
  })();

  return refreshPromise;
}
