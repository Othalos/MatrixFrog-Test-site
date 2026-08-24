import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Turbopack configuration for Next.js 15+
  turbopack: {},
  // Webpack fallback for older builds
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    return config;
  },
  // Tell Next.js to ignore the specific modules causing issues
    serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
};

export default nextConfig;
