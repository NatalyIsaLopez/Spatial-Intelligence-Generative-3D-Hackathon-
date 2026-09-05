import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mint serves previews and thumbnails from its CDN.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.mint.gg" }],
  },
};

export default nextConfig;
