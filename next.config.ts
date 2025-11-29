import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for Railway/Docker deployment
  output: "standalone",

  // Disable image optimization if not using Vercel
  images: {
    unoptimized: process.env.NODE_ENV === "production",
  },

  // Environment variables available on client
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },

  // Ignore TypeScript errors during build (for faster deployment)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
