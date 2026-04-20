// @ts-nocheck
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Re-activamos obligatoriamente para que Chrome apruebe la instalación Desktop
  register: true,
  skipWaiting: true,
  workboxOptions: {
    // Forzamos a que siempre priorice la red en vivo (NetworkFirst). Si falla, tira de caché.
    // Esto es NECESARIO porque Chrome bloquea la instalación Desktop si la app no tiene fallback offline.
    runtimeCaching: [
      {
        urlPattern: /.*/i,
        handler: 'NetworkFirst',
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
