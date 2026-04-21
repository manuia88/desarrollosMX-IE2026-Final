import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '@/shared/types/database';
import {
  buildCausalSection,
  buildCitationUrl,
  extractFirstParagraph,
  mapCitations,
} from '../lib/causal-section-builder';

type TestSupabase = SupabaseClient<Database>;

interface CausalRow {
  explanation_md: string;
  citations: unknown;
  generated_at: string;
}

function createFakeSupabase(row: CausalRow | null, errorMsg?: string): TestSupabase {
  const from = vi.fn(() => {
    const builder: Record<string, unknown> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.limit = vi.fn(() => builder);
    builder.maybeSingle = vi.fn(async () => ({
      data: row,
      error: errorMsg ? { message: errorMsg } : null,
    }));
    return builder;
  });
  return { from } as unknown as TestSupabase;
}

describe('extractFirstParagraph', () => {
  it('returns empty for null/undefined', () => {
    expect(extractFirstParagraph(null)).toBe('');
    expect(extractFirstParagraph(undefined)).toBe('');
    expect(extractFirstParagraph('   ')).toBe('');
  });

  it('returns only the first paragraph', () => {
    const md = 'Primer párrafo sobre Roma Norte.\n\nSegundo párrafo sobre Condesa.';
    expect(extractFirstParagraph(md)).toBe('Primer párrafo sobre Roma Norte.');
  });

  it('strips leading heading markers and blockquotes', () => {
    const md = '## Título\n> Cita\nCuerpo.';
    const result = extractFirstParagraph(md);
    expect(result).not.toContain('##');
    expect(result).not.toMatch(/^>/);
    expect(result).toContain('Cuerpo.');
  });
});

describe('buildCitationUrl', () => {
  it('uses explicit href when absolute URL', () => {
    const url = buildCitationUrl(
      'https://desarrollosmx.com',
      'es-MX',
      'score:IPV',
      'https://external.example.com/page',
    );
    expect(url).toBe('https://external.example.com/page');
  });

  it('falls back to site/fuentes/[refId] when no href', () => {
    const url = buildCitationUrl('https://desarrollosmx.com', 'es-MX', 'score:IPV-roma', null);
    expect(url).toBe('https://desarrollosmx.com/es-MX/fuentes/score%3AIPV-roma');
  });

  it('ignores relative hrefs and falls back', () => {
    const url = buildCitationUrl('https://site.com', 'en-US', 'macro:INEGI', '/relative');
    expect(url).toBe('https://site.com/en-US/fuentes/macro%3AINEGI');
  });
});

describe('mapCitations', () => {
  it('limits to maxCitations', () => {
    const citations = Array.from({ length: 6 }, (_, i) => ({
      ref_id: `ref-${i}`,
      type: 'score' as const,
      label: `Label ${i}`,
      value: null,
      source: 'DMX',
      href: null,
      as_of: null,
    }));
    const mapped = mapCitations(citations, 'https://x.com', 'es-MX', 3);
    expect(mapped).toHaveLength(3);
  });
});

describe('buildCausalSection', () => {
  it('returns unavailable when row not found', async () => {
    const supabase = createFakeSupabase(null);
    const result = await buildCausalSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      supabase,
    });
    expect('unavailable' in result && result.unavailable).toBe(true);
    if ('unavailable' in result) expect(result.reason).toBe('no_causal_for_period');
  });

  it('returns unavailable on DB error', async () => {
    const supabase = createFakeSupabase(null, 'timeout');
    const result = await buildCausalSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      supabase,
    });
    expect('unavailable' in result && result.unavailable).toBe(true);
  });

  it('builds bundle from DB row with citations', async () => {
    const row: CausalRow = {
      explanation_md:
        'Roma Norte sube por migración de creativos del sur de CDMX.\n\nAdemás hubo aperturas alpha.',
      citations: [
        {
          ref_id: 'score:IPV-roma-2026-03',
          type: 'score',
          label: 'IPV Roma',
          source: 'DMX',
          value: 82,
          href: null,
          as_of: '2026-03-01',
        },
      ],
      generated_at: '2026-04-15T10:00:00Z',
    };
    const supabase = createFakeSupabase(row);
    const result = await buildCausalSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      supabase,
      siteUrl: 'https://desarrollosmx.com',
    });
    if ('unavailable' in result) throw new Error('should succeed');
    expect(result.paragraph).toContain('Roma Norte');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.url).toContain('/fuentes/score%3AIPV-roma-2026-03');
  });

  it('uses causalHook when provided', async () => {
    const supabase = createFakeSupabase(null);
    const result = await buildCausalSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      supabase,
      causalHook: async () => ({
        explanation_md: 'Hooked explanation about Roma.\n\nSecond para.',
        citations: [],
      }),
    });
    if ('unavailable' in result) throw new Error('should succeed');
    expect(result.paragraph).toBe('Hooked explanation about Roma.');
  });

  it('falls through to DB when hook returns null', async () => {
    const row: CausalRow = {
      explanation_md: 'DB explanation.',
      citations: [],
      generated_at: '2026-04-15T10:00:00Z',
    };
    const supabase = createFakeSupabase(row);
    const result = await buildCausalSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      supabase,
      causalHook: async () => null,
    });
    if ('unavailable' in result) throw new Error('should succeed');
    expect(result.paragraph).toBe('DB explanation.');
  });

  it('returns empty_explanation when paragraph is blank', async () => {
    const row: CausalRow = {
      explanation_md: '   \n\n   ',
      citations: [],
      generated_at: '2026-04-15T10:00:00Z',
    };
    const supabase = createFakeSupabase(row);
    const result = await buildCausalSection({
      scopeId: 'roma-norte',
      countryCode: 'MX',
      periodDate: '2026-04-01',
      supabase,
    });
    expect('unavailable' in result && result.reason).toBe('empty_explanation');
  });
});
