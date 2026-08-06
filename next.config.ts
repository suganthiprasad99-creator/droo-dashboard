import type { NextConfig } from "next";

const apiBaseUrl = (process.env.DROO_API_BASE_URL || 'http://localhost:18080').replace(/\/v1\/?$/, '');
const integrationsApiBaseUrl = process.env.DROO_INTEGRATIONS_API_BASE_URL || 'http://localhost:8000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/v1/:path*', destination: `${apiBaseUrl}/v1/:path*` },
      { source: '/int/v1/:path*', destination: `${integrationsApiBaseUrl}/int/v1/:path*` },
    ]
  },
};

export default nextConfig;
