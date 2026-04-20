// @ts-nocheck
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Forzar generación de SW en development para pruebas locales
  register: true,
  skipWaiting: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offline-network-first-cache',
          expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 }
        }
      }
    ]
  }
});

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    }
  }
};

export default withPWA(nextConfig);
