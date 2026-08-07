import axios, { type InternalAxiosRequestConfig } from "axios";
import { ApiError } from "./client";
import { tryRefresh } from "../auth/refresh";
import { TriggerSessionExpired } from "../auth/session";

/**
 * Configured axios instance + interceptors that reproduce the exact semantics
 * of the former `fetch`-based `req()` in `client.ts`.
 *
 * Contract (preserved bit-for-bit):
 * - `withCredentials: true` so the HttpOnly session cookie travels on every
 *   same-origin request (the shell rewrites `/api/*` to the backend).
 * - No `baseURL`: paths stay relative (`/api/...`).
 * - Request body present -> `Content-Type: application/json` (axios
 *   auto-serializes plain objects, so we only set the header).
 * - Response success: `204` or empty body resolves `undefined`; otherwise the
 *   parsed body.
 * - Response error:
 *     * network error (no `err.response`) -> rethrown as-is (matches the old
 *       `fetch` `TypeError`);
 *     * `401`, not yet retried, not opted out -> attempt ONE refresh via the
 *       `tryRefresh` dedup singleton; on success replay the original request
 *       once (guarded by the `retried` config flag, decision D4); on failure
 *       fire `TriggerSessionExpired("apiClient")` and reject with
 *       `ApiError(401, "Sesión expirada")`;
 *     * `401` after a retry, or `401` on an opt-out call (login/logout) ->
 *       reject directly with `ApiError(401, "Credenciales inválidas")` for
 *       opt-out, else `ApiError(401, "Sesión expirada")`; opt-out never opens
 *       the session-expired modal;
 *     * any other non-2xx -> `ApiError(status, body.message ?? "Error N",
 *       body.details)`.
 *
 * `retried` is carried on the axios config (not a closure var): the config
 * object survives `instance(config)` re-entry, so exactly one retry is
 * guaranteed even under concurrent 401s (no loop, no duplicate refresh).
 */

// Module-augment AxiosRequestConfig with the two flags the interceptors use.
// `retried` guards one-shot 401 replay; `skipAuthRefresh` opts a call out of
// refresh-first recovery (login/logout, whose 401 is NOT an expired session).
declare module "axios" {
  interface AxiosRequestConfig {
    retried?: boolean;
    skipAuthRefresh?: boolean;
  }
}

export const apiClientInstance = axios.create({ withCredentials: true });

// Request interceptor: JSON Content-Type whenever a body is present.
apiClientInstance.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  if (cfg.data !== undefined) {
    cfg.headers.set("Content-Type", "application/json");
  }
  return cfg;
});

// Response success: 204 / empty body -> undefined, else the body.
apiClientInstance.interceptors.response.use(
  (res) =>
    res.status === 204 || res.data == null ? (undefined as never) : res.data,
  async (err: any) => {
    const cfg = err.config ?? {};
    // Network error (no response): reject as-is (non-ApiError, like fetch TypeError).
    if (!err.response) throw err;

    const { status, data } = err.response;

    // 401 -> refresh-first, but only once and only when not opted out.
    if (status === 401 && !cfg.retried && !cfg.skipAuthRefresh) {
      const ok = await tryRefresh();
      if (ok) {
        cfg.retried = true;
        return apiClientInstance.request(cfg); // replay ONCE with rotated cookie
      }
      // Refresh failed -> the session is genuinely expired.
      TriggerSessionExpired("apiClient");
      throw new ApiError(401, "Sesión expirada");
    }

    // 401 after a retry, or 401 on an opt-out call (login/logout). No recovery.
    if (status === 401) {
      if (!cfg.skipAuthRefresh) TriggerSessionExpired("apiClient");
      throw new ApiError(
        401,
        cfg.skipAuthRefresh ? "Credenciales inválidas" : "Sesión expirada",
      );
    }

    // Any other non-2xx -> ApiError carrying the body-derived message/details.
    const body = (data ?? {}) as { message?: string; details?: unknown };
    throw new ApiError(status, body.message ?? `Error ${status}`, body.details);
  },
);
