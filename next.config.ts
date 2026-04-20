// @ts-nocheck
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Re-activamos obligatoriamente para que Chrome apruebe la instalación Desktop
  register: true,
  skipWaiting: true,
  workboxOptions: {
    // Forzamos a que ignore el caché y siempre traiga datos frescos del servidor (Online Only)
    runtimeCaching: [
      {
        urlPattern: /.*/i,
        handler: 'NetworkOnly',
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
