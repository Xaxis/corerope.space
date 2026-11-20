import path from "node:path";
import type { NextConfig } from "next";

// The repository root: the site reads research/, experiments/ and data/ from it at build time, and
// it holds the workspace lockfile. Naming it stops Next from guessing in worktrees.
const repoRoot = path.join(import.meta.dirname, "..");

// Every page is static and the site takes no input, so the policy is strict about where things load
// from. Next.js inlines its hydration data as scripts, which a static page cannot give a nonce, so
// scripts allow 'unsafe-inline' from this origin only. Nothing is loaded from anywhere else.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  // The commit a deploy was built from, printed in every page's head (tools/site/deploy.sh checks it).
  env: { CORE_BUILD: process.env.CORE_BUILD?.trim() || "dev" },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // React's development build needs eval.
          {
            key: "Content-Security-Policy",
            value: isDev ? CSP.replace("'unsafe-inline'", "'unsafe-inline' 'unsafe-eval'") : CSP,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
