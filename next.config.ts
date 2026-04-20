// @ts-nocheck
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
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
