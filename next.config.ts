import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // Next.js injects inline bootstrap scripts into the prerendered shell; nonces would force
      // every page to render dynamically, so 'unsafe-inline' is used and third-party scripts are not allowed.
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  // The consent and progress screens were removed: signing in reads every registry at once.
  async redirects() {
    return [
      { source: "/zgoda", destination: "/sytuacja", permanent: false },
      { source: "/pobieranie", destination: "/sytuacja", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
