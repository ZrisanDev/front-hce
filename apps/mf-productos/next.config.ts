import type { NextConfig } from "next";

/**
 * Zone: Productos — port 3001, basePath /productos.
 *
 * basePath + assetPrefix isolate this zone's pages and static assets so the
 * shell can route /productos/* here without clashing with other zones.
 *
 * The `/api` rewrite uses basePath:false so a same-origin `/api/...` request is
 * proxied to the backend even when the zone is reached directly on its own port
 * (without it, Next would auto-prefix the source to /productos/api/:path*).
 * When the zone is reached through the shell, the browser's origin is the shell
 * and `/api/...` is handled by the shell's rewrite instead.
 */
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5050";

const nextConfig: NextConfig = {
  basePath: "/productos",
  assetPrefix: "/productos/",
  transpilePackages: ["@hce/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND}/api/:path*`,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
