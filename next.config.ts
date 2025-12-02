import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Environment variables for Railway
  env: {
    PORT: process.env.PORT || '3000',
  },
};

export default nextConfig;
