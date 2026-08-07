/**
 * Same-origin API client for the HCE front-end.
 *
 * Every request goes to a RELATIVE path (`/api/...`). The Multi-Zones
 * `rewrites` in each app's `next.config.ts` proxies `/api/*` to the backend on
 * the server side, which makes the call same-origin from the browser's point of
 * view. This keeps the HttpOnly session cookie working with the default
 * `SameSite=Lax` policy and avoids CORS entirely.
 *
 * The backend URL is therefore NEVER exposed to the browser: there is no
 * `NEXT_PUBLIC_API_URL`. `credentials: "include"` is mandatory so the cookie
 * travels with every request.
 */

import { TriggerSessionExpired } from "../auth/session";
import { tryRefresh } from "../auth/refresh";
import type {
  ActualizarProductoDto,
  Compra,
  DocDto,
  DocVentaDto,
  KardexFilters,
  MovimientoKardex,
  Producto,
  RegistrarProductoDto,
  Venta,
} from "../types";

/**
 * Runtime throwable for API failures. Implements the `ApiError` structural type
 * declared in `@hce/shared/types`.
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type ReqOpts = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Skip the refresh-first 401 recovery path. Set on calls whose 401 is NOT
   * "session expired" — login (bad credentials) and logout — so they fail
   * directly instead of triggering a pointless refresh or the session-expired
   * modal.
   */
  skipAuthRefresh?: boolean;
};

/**
 * Low-level request helper. Throws `ApiError` on non-2xx.
 *
 * 401 recovery is refresh-first: when an access token expires, we attempt ONE
 * `POST /api/auth/refresh` (deduped across concurrent 401s via `tryRefresh`)
 * and, on success, transparently retry the original request with the rotated
 * cookie. Only when the refresh itself fails (refresh token invalid/expired/
 * revoked, or a network error) do we fire `TriggerSessionExpired` so the
 * blocking modal appears. Calls that opt out via `skipAuthRefresh` (login,
 * logout) bypass recovery entirely: their 401 is a hard failure, not an
 * expired session.
 *
 * The `retried` guard ensures we retry at most once — a 401 after a successful
 * refresh, or a 401 on a retry, is terminal and never triggers another refresh
 * (preventing infinite loops).
 *
 * Responses with an empty body resolve to `undefined`; the caller types the
 * expected payload via `T`.
 */
export async function req<T>(
  path: string,
  opts: ReqOpts = {},
  retried = false,
): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? "GET",
    credentials: "include",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  // 401 → refresh-first, but only once and only when not opted out.
  if (res.status === 401 && !retried && !opts.skipAuthRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return req<T>(path, opts, true); // retry once with the new cookie
    }
    // Refresh failed → the session is genuinely expired.
    TriggerSessionExpired("apiClient");
    throw new ApiError(401, "Sesión expirada");
  }

  // 401 after a retry, or 401 on an opt-out call (login/logout). No recovery.
  if (res.status === 401) {
    if (!opts.skipAuthRefresh) TriggerSessionExpired("apiClient");
    throw new ApiError(
      401,
      opts.skipAuthRefresh ? "Credenciales inválidas" : "Sesión expirada",
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      details?: unknown;
    };
    throw new ApiError(
      res.status,
      body.message ?? `Error ${res.status}`,
      body.details,
    );
  }

  // 204 No Content or empty body -> resolve to undefined.
  return res.json().catch(() => undefined as unknown as T) as Promise<T>;
}

/**
 * Build a query string from kardex filters, omitting empty/undefined values.
 *
 * The TS-facing `KardexFilters` uses camelCase keys, but the back-hce
 * ListarKardexQuery DTO binds snake_case query params
 * (id_producto, fecha_inicio, fecha_fin, id_tipo_movimiento). Nest's global
 * ValidationPipe runs `whitelist` + `forbidNonWhitelisted`, so camelCase keys
 * would be silently dropped (and thus every filter ignored). We serialize to
 * the backend's snake_case contract here.
 */
function buildQuery(filters: KardexFilters): string {
  const params = new URLSearchParams();
  if (filters.idProducto != null) {
    params.set("id_producto", String(filters.idProducto));
  }
  if (filters.fechaInicio) params.set("fecha_inicio", filters.fechaInicio);
  if (filters.fechaFin) params.set("fecha_fin", filters.fechaFin);
  if (filters.idTipoMovimiento != null) {
    params.set("id_tipo_movimiento", String(filters.idTipoMovimiento));
  }
  const qs = params.toString();
  return qs; // may be ""
}

export const apiClient = {
  auth: {
    /** POST /api/auth/login. The HttpOnly cookie is the source of truth; the
     * response body is not consumed (AuthProvider deduces status from 2xx).
     * `skipAuthRefresh`: a 401 here means bad credentials, NOT an expired
     * session — never refresh or show the session-expired modal for it. */
    login: (username: string, password: string) =>
      req<void>("/api/auth/login", {
        method: "POST",
        body: { username, password },
        skipAuthRefresh: true,
      }),
    /** POST /api/auth/logout. Revokes the session server-side. `skipAuthRefresh`
     * keeps a logout-time 401 (e.g. refresh already expired) from looping into
     * a refresh attempt. */
    logout: () =>
      req<void>("/api/auth/logout", { method: "POST", skipAuthRefresh: true }),
  },

  productos: {
    list: () => req<Producto[]>("/api/productos"),
    create: (data: RegistrarProductoDto) =>
      req<Producto>("/api/productos", { method: "POST", body: data }),
    update: (id: number, data: ActualizarProductoDto) =>
      req<Producto>(`/api/productos/${id}`, { method: "PATCH", body: data }),
  },

  compras: {
    list: () => req<Compra[]>("/api/compras"),
    create: (data: DocDto) =>
      req<void>("/api/compras", { method: "POST", body: data }),
  },

  ventas: {
    list: () => req<Venta[]>("/api/ventas"),
    create: (data: DocVentaDto) =>
      req<void>("/api/ventas", { method: "POST", body: data }),
  },

  kardex: {
    list: (filters: KardexFilters = {}) =>
      req<MovimientoKardex[]>(`/api/kardex?${buildQuery(filters)}`),
  },
};
