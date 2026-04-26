import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  turbopack: {},
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'bcrypt'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    }
  }
};

export default nextConfig;
