import type { NextConfig } from "next";

const apiOrigin = (process.env.API_INTERNAL_BASE_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/:path*`
      }
    ];
  }
};

export default nextConfig;
