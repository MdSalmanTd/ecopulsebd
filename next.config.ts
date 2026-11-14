import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Database / cache drivers load native or WASM files at runtime — keep them out of the bundle.
  serverExternalPackages: ["pg", "@electric-sql/pglite", "redis"],

  // Keep the old static-site URLs working.
  async redirects() {
    return [
      { source: "/index.html", destination: "/reports", permanent: true },
      { source: "/rewards.html", destination: "/rewards", permanent: true },
      { source: "/assistant.html", destination: "/assistant", permanent: true },
      { source: "/sign-in.html", destination: "/sign-in", permanent: true },
    ];
  },
};

export default nextConfig;
