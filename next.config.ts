import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Disable type checking during build (already done in CI)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Experimental features for better production performance
  experimental: {
    // Reduce bundle size
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // AI Providers + AWS + Google Vision + Railway + Upstash
              "connect-src 'self' https://generativelanguage.googleapis.com https://api.groq.com https://api.anthropic.com https://api.openai.com https://*.amazonaws.com https://vision.googleapis.com wss://*.railway.app https://*.upstash.io",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
