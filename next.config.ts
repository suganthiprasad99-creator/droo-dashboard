import type { NextConfig } from "next";

const apiBaseUrl = process.env.DROO_API_BASE_URL || 'http://localhost:8082';

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/v1/:path*', destination: `${apiBaseUrl}/v1/:path*` }]
  },
};

export default nextConfig;
