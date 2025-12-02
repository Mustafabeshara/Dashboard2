import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Disable type checking during build (already done in CI)
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Disable ESLint during build (already done in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Experimental features for better production performance
  experimental: {
    // Reduce bundle size
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

export default nextConfig;
