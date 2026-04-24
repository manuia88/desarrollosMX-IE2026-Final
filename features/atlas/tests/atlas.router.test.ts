import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

describe('atlasRouter — module export smoke', () => {
  it('exports atlasRouter with expected procedures', async () => {
    const mod = await import('../routes/atlas');
    expect(mod.atlasRouter).toBeDefined();
    const record = mod.atlasRouter as unknown as Record<string, unknown>;
    expect(record.getByColoniaSlug).toBeDefined();
    expect(record.listPublishedColonias).toBeDefined();
  });
});

describe('atlas schemas — input validation', () => {
  it('getByColoniaSlugInputSchema accepts valid kebab-case slug', async () => {
    const { getByColoniaSlugInputSchema } = await import('../schemas/atlas');
    const parsed = getByColoniaSlugInputSchema.parse({ slug: 'roma-norte' });
    expect(parsed.slug).toBe('roma-norte');
  });

  it('getByColoniaSlugInputSchema rejects uppercase', async () => {
    const { getByColoniaSlugInputSchema } = await import('../schemas/atlas');
    expect(() => getByColoniaSlugInputSchema.parse({ slug: 'RomaNorte' })).toThrow();
  });

  it('getByColoniaSlugInputSchema rejects leading/trailing hyphen', async () => {
    const { getByColoniaSlugInputSchema } = await import('../schemas/atlas');
    expect(() => getByColoniaSlugInputSchema.parse({ slug: '-roma-' })).toThrow();
  });

  it('listPublishedColoniasInputSchema applies defaults', async () => {
    const { listPublishedColoniasInputSchema } = await import('../schemas/atlas');
    const parsed = listPublishedColoniasInputSchema.parse({});
    expect(parsed.countryCode).toBe('MX');
    expect(parsed.limit).toBe(200);
  });

  it('listPublishedColoniasInputSchema clamps limit max 500', async () => {
    const { listPublishedColoniasInputSchema } = await import('../schemas/atlas');
    expect(() => listPublishedColoniasInputSchema.parse({ limit: 1000 })).toThrow();
  });
});

describe('wikiEntrySchema', () => {
  it('validates a complete entry', async () => {
    const { wikiEntrySchema } = await import('../schemas/atlas');
    const entry = {
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      colonia_id: 'ffffffff-aaaa-4bbb-8ccc-dddddddddddd',
      slug: 'roma-norte',
      label: 'Roma Norte',
      version: 1,
      content_md: '# Roma Norte\n\nContenido.',
      sections: [{ key: 'intro', heading: 'Intro', content_md: 'Breve.' }],
      published: true,
      reviewed: false,
      edited_at: '2026-04-24T10:00:00Z',
    };
    expect(() => wikiEntrySchema.parse(entry)).not.toThrow();
  });
});
