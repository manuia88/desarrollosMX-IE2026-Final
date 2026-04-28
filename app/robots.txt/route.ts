// F14.F.8 Sprint 7 BIBLIA Upgrade 3 — robots.txt allow public + disallow private.

export function GET(): Response {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://desarrollosmx.com';
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Allow: /studio/',
    'Disallow: /studio-app/',
    'Disallow: /asesores/',
    'Disallow: /admin/',
    'Disallow: /settings/',
    'Disallow: /api/',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
  ].join('\n');
  return new Response(lines, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 's-maxage=3600',
    },
  });
}
