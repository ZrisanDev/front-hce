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

import { apiClientInstance } from "./axios-instance";
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
 * Thin adapter over the configured axios instance (`axios-instance.ts`); all
 * HTTP behavior lives there: `withCredentials`, JSON headers, 401
 * refresh-first-ONCE recovery, the `skipAuthRefresh` opt-out, 204/empty body
 * -> `undefined`, and `ApiError(status, message, details)` on non-2xx. The
 * one-shot retry guard is carried on the axios config (decision D4), so the
 * `retried` parameter is gone from this signature. The caller types the
 * expected payload via `T`.
 */
export async function req<T>(
  path: string,
  opts: ReqOpts = {},
): Promise<T> {
  const data = await apiClientInstance.request({
    url: path,
    method: opts.method ?? "GET",
    data: opts.body,
    signal: opts.signal,
    skipAuthRefresh: opts.skipAuthRefresh,
  });
  return data as T;
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
