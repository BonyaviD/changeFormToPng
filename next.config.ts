import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The app is fully client-side: every certificate is rendered, rasterised and
   * stored in the browser. Exporting a static bundle keeps it deployable to any
   * dumb host (GitHub Pages, a shared drive, an internal IIS folder).
   */
  output: "export",
  images: {
    // `next/image` optimisation needs a server; we ship plain <img> semantics.
    unoptimized: true,
  },
};

export default nextConfig;
