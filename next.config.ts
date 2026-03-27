import type { NextConfig } from "next";
const nextConfig = {
  output: "standalone",
  experimental: {
    turbo: false,
  },
};

export default nextConfig;