import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  // @ts-ignore
  eslint: { ignoreDuringBuilds: true },
  turbopack: {},
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'bcrypt'],
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    }
  }
};

export default withPWA(nextConfig);
