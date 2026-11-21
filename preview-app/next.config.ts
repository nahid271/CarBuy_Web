import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  trailingSlash: true,
  basePath: "/CarBuy_Web/preview",
  assetPrefix: "/CarBuy_Web/preview",
  cacheComponents: false,
  partialPrefetching: false,
  images: {
    unoptimized: true,
    // 80 is for the full-width hero plates; everything else uses the default 75.
    qualities: [75, 80],
    // Demo photography only. Every Unsplash URL is built by unsplash() in
    // src/lib/mock-listings.ts, so the query string is pinned to that one shape.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
        search: "?fit=crop&w=2000&q=80",
      },
    ],
  },
  turbopack: {
    root: path.join(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
