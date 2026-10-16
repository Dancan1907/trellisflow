import type { NextConfig } from 'next';

/**
 * Next.js configuration for TrellisFlow.
 *
 * Kept minimal for now. Additional settings (rewrites, image domains,
 * environment-specific config) will be added as needed.
 */
const nextConfig: NextConfig = {
  // Enable React Strict Mode — catches common React bugs in development.
  reactStrictMode: true,

  // The API URL for client-side requests. Comes from env vars.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  },

  // Ensure TypeScript errors fail the build (do not ignore).
  typescript: {
    ignoreBuildErrors: false,
  },

  // Ensure ESLint errors fail the build.
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
