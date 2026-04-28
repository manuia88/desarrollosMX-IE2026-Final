// F14.F.8 Sprint 7 BIBLIA Upgrade 3 — Sitemap dinámico galerías públicas.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export async function GET(): Promise<Response> {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://desarrollosmx.com';
  const supabase = createAdminClient();
  const { data: galleries } = await supabase
    .from('studio_public_galleries')
    .select('slug, updated_at')
    .eq('is_active', true)
    .limit(5000);

  const urlsetEntries: string[] = [
    `<url><loc>${BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  ];
  for (const g of galleries ?? []) {
    if (!g.slug) continue;
    urlsetEntries.push(
      `<url><loc>${BASE_URL}/studio/${g.slug}</loc><lastmod>${
        g.updated_at ? new Date(g.updated_at).toISOString() : new Date().toISOString()
      }</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsetEntries.join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
