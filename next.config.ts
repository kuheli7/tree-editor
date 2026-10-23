import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The floating dev "N" badge covers the bottom-left sidebar while demoing.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
