import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les routes API lisent les cours de marché sur le disque : on les inclut dans le déploiement.
  outputFileTracingIncludes: {
    "/api/**": ["./data/**/*"],
  },
  poweredByHeader: false,
};

export default nextConfig;
