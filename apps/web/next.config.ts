import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@finnberry/api",
    "@finnberry/db",
    "@finnberry/schemas",
    "@finnberry/utils",
  ],
  typedRoutes: true,
};

export default nextConfig;
