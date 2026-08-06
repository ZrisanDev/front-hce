/**
 * Session-expired singleton (pure module state, no React).
 *
 * Lives outside React so a single dedup flag is shared app-wide: when the
 * apiClient receives a 401 it calls `TriggerSessionExpired`, and no matter how
 * many concurrent requests fail only ONE modal is shown. React providers
 * subscribe via `subscribeSessionExpired` and render the modal (PR3).
 *
 * `resetSessionExpired()` must be called after a successful login so the flag
 * clears and the modal does not reappear on the next 401.
 */

let isSessionExpiredShown = false;

/** Reserved for diagnostics: the last source that triggered the expiry. */
let lastSource: string | undefined;

const listeners = new Set<(expired: boolean) => void>();

/**
 * Mark the session as expired and notify all subscribers exactly once.
 * Concurrent 401s are collapsed: once shown, subsequent calls are no-ops until
 * `resetSessionExpired()` runs.
 *
 * @param src identifier of the caller (e.g. "apiClient") for diagnostics.
 */
export function TriggerSessionExpired(src: string): void {
  if (isSessionExpiredShown) return;
  isSessionExpiredShown = true;
  lastSource = src;
  listeners.forEach((listener) => listener(true));
}

/**
 * Subscribe to session-expiry changes. Returns an unsubscribe function.
 * The callback receives `true` when expired and `false` when reset.
 */
export function subscribeSessionExpired(
  cb: (expired: boolean) => void,
): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Clear the expired flag and notify subscribers. Call after a successful login. */
export function resetSessionExpired(): void {
  isSessionExpiredShown = false;
  lastSource = undefined;
  listeners.forEach((listener) => listener(false));
}

/** Read-only access to the current flag state. Mainly for tests/diagnostics. */
export function isSessionExpiredFlagSet(): boolean {
  return isSessionExpiredShown;
}

/** Read-only access to the last source that triggered the expiry. */
export function getLastSessionExpiredSource(): string | undefined {
  return lastSource;
}
