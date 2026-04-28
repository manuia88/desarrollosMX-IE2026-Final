import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { GET as robotsGet } from '@/app/robots.txt/route';
import { GET as sitemapGet } from '@/app/sitemap.xml/route';
import { createAdminClient } from '@/shared/lib/supabase/admin';

describe('sitemap.xml + robots.txt', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.dmx.com';
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sitemap.xml lista todas las galerías activas', async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({
              data: [
                { slug: 'manu', updated_at: '2026-04-27T00:00:00Z' },
                { slug: 'sofi', updated_at: '2026-04-26T00:00:00Z' },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof createAdminClient>);
    const response = await sitemapGet();
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).toContain('https://test.dmx.com/studio/manu');
    expect(text).toContain('https://test.dmx.com/studio/sofi');
    expect(response.headers.get('Content-Type')).toMatch(/xml/);
  });

  it('sitemap.xml incluye home url + cache headers', async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
      }),
    } as unknown as ReturnType<typeof createAdminClient>);
    const response = await sitemapGet();
    const text = await response.text();
    expect(text).toContain('https://test.dmx.com/');
    expect(response.headers.get('Cache-Control')).toMatch(/s-maxage/);
  });

  it('robots.txt allow public + disallow private + sitemap link', () => {
    const response = robotsGet();
    return response.text().then((text) => {
      expect(text).toContain('Allow: /studio/');
      expect(text).toContain('Disallow: /studio-app/');
      expect(text).toContain('Disallow: /admin/');
      expect(text).toContain('Sitemap: https://test.dmx.com/sitemap.xml');
    });
  });
});
