import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Electron production builds
  output: "standalone",
  devIndicators: false,
};

export default nextConfig;
