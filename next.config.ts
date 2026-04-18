import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'qxfuqwlktmhokwwlvggy.supabase.co' },
      { protocol: 'https', hostname: 'api.mapbox.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
