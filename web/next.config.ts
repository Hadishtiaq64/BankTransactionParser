import type { NextConfig } from "next";

const API_BASE = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/transactions/:path*",
        destination: `${API_BASE}/api/transactions/:path*`,
      },
    ];
  },
};

export default nextConfig;
