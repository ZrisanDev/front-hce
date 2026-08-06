/**
 * Centralized route paths for cross-zone navigation.
 *
 * Zones use Multi-Zones `basePath`, so absolute paths must never be hard-coded
 * in components — always reference `ROUTES.*` to stay consistent and avoid
 * drift if a route changes. Cross-zone links use `<a href>` (hard navigation)
 * because `next/link` cannot soft-navigate between zones.
 */

export const ROUTES = {
  home: "/",
  login: "/login",
  logout: "/logout",
  productos: "/productos",
  compras: "/compras",
  ventas: "/ventas",
  kardex: "/kardex",
} as const;

export type RouteKey = keyof typeof ROUTES;

export type RoutePath = (typeof ROUTES)[RouteKey];
