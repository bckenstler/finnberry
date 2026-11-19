import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

// Next.js inlines its bootstrap scripts and styles, which is why both need
// 'unsafe-inline'; a nonce-based policy would force every page to render
// dynamically. The development server also evaluates code and holds a
// websocket open for hot reload. Images may come from any https origin
// because profile pictures are served by the sign-in provider.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Browsers ignore this over plain http, so a LAN deployment is unaffected.
  // No includeSubDomains: the app cannot know what else shares its domain.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];

const nextConfig: NextConfig = {
  transpilePackages: [
    "@finnberry/api",
    "@finnberry/db",
    "@finnberry/schemas",
    "@finnberry/utils",
  ],
  typedRoutes: true,
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};

export default nextConfig;
