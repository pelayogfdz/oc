// @ts-nocheck
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb'
    }
  }
};

export default nextConfig;
