import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./shared/lib/i18n/request.ts');

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
  // Security headers (CSP + HSTS + etc) viven en middleware.ts — ver FASE 06 §6.D.
};

export default withNextIntl(nextConfig);
