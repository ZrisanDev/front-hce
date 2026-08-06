import type { NextConfig } from "next";

/**
 * Zone: Kardex — port 3004, basePath /kardex.
 * See apps/mf-productos/next.config.ts for the rationale on
 * basePath/assetPrefix and the basePath:false /api proxy.
 */
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5050";

const nextConfig: NextConfig = {
  basePath: "/kardex",
  assetPrefix: "/kardex/",
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
