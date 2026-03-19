import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentationHook was removed in Next.js 15+ (always on).
  // Removing to fix TypeScript build error.
};

export default nextConfig;
