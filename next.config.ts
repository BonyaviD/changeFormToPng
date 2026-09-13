import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Authentication must run before pages and assets are served. Static export
  // would bypass the server gate; deploy this app with the Next.js runtime.
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
