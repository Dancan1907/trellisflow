import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensures Next.js treats the monorepo root as the tracing root.
  outputFileTracingRoot: path.join(process.cwd(), '../../'),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
  typescript: { ignoreBuildErrors: false },
  // ESLint runs separately via `pnpm lint`. Disabling it during build
  // avoids duplicate work and a Next.js 15 flat-config warning.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
