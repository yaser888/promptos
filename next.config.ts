import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Link",
          value: '<manifest.json>; rel="manifest"',
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://img.clerk.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://img.clerk.com https://images.unsplash.com; font-src 'self' data:; connect-src 'self' https://api.clerk.com https://*.clerk.com wss://*.clerk.com; frame-src 'self' https://challenges.cloudflare.com;",
        },
      ],
    },
  ],
  poweredByHeader: false,
  compress: true,
};

export default withNextIntl(config);
