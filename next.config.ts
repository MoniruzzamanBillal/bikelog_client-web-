import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // ! Emits .next/standalone — a self-contained server.js plus a file-traced minimal
  // ! node_modules. Required by the Dockerfile's runner stage, which ships only that
  // ! output plus .next/static and public/ instead of the full dependency tree.
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.postimg.cc",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
