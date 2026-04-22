import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  allowedDevOrigins: ['192.168.1.13', '192.168.240.1'],
  serverExternalPackages: ['better-sqlite3', 'prisma', '@prisma/client', '@prisma/adapter-better-sqlite3'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
