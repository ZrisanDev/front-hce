import type { NextConfig } from "next";

/**
 * Shell (host zone) — served on port 3000 with NO basePath.
 *
 * Rewrites, in order:
 *   1. `/api/:path*` -> backend (same-origin proxy). MUST be first so the
 *      browser always calls same-origin `/api/...` and the HttpOnly auth cookie
 *      travels with SameSite=Lax. The backend URL is server-side only and is
 *      never exposed to the client (no NEXT_PUBLIC_*).
 *   2. The four zone paths -> each zone app (3001-3004).
 *
 * Zone upstreams are overridable via API_ZONA_<NAME> for docker-compose.
 */
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5050";
const zone = (port: number, name: string) =>
  process.env[`API_ZONA_${name}`] ?? `http://localhost:${port}`;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // 1) Same-origin API proxy (resolves CORS + SameSite for credentials).
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      // 2) Zone routing (Multi-Zones).
      {
        source: "/productos/:path*",
        destination: `${zone(3001, "PRODUCTOS")}/productos/:path*`,
      },
      {
        source: "/compras/:path*",
        destination: `${zone(3002, "COMPRAS")}/compras/:path*`,
      },
      {
        source: "/ventas/:path*",
        destination: `${zone(3003, "VENTAS")}/ventas/:path*`,
      },
      {
        source: "/kardex/:path*",
        destination: `${zone(3004, "KARDEX")}/kardex/:path*`,
      },
    ];
  },
  serverActions: {
    allowedOrigins: ["localhost:3000"],
  },
};

export default nextConfig;
