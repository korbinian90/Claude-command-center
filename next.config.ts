import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["node-pty", "chokidar", "ws"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
