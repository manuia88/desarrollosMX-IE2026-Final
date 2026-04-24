import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '@/shared/types/scores';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

describe('CitationsList — module export smoke', () => {
  it('exporta CitationsList como función', async () => {
    const mod = await import('../CitationsList');
    expect(typeof mod.CitationsList).toBe('function');
    expect(mod.CitationsList.name).toBe('CitationsList');
  });

  it('acepta lista vacía sin lanzar', async () => {
    const mod = await import('../CitationsList');
    const result = mod.CitationsList({ citations: [] });
    expect(result).not.toBeNull();
  });

  it('acepta citations de los 4 tipos de tono', async () => {
    const mod = await import('../CitationsList');
    const citations: ReadonlyArray<Citation> = [
      { ref_id: 'score:a', type: 'score', label: 'IPV', value: 88.2, source: 'DMX' },
      { ref_id: 'macro:b', type: 'macro', label: 'Tasa Banxico', value: 10.5, source: 'Banxico' },
      { ref_id: 'geo:c', type: 'geo', label: 'Transporte', value: 'alto', source: 'GTFS' },
      { ref_id: 'news:d', type: 'news', label: 'Apertura metro', value: null, source: 'El País' },
    ];
    const result = mod.CitationsList({ citations });
    expect(result).toBeTruthy();
  });

  it('acepta citations con href y as_of opcionales', async () => {
    const mod = await import('../CitationsList');
    const citations: ReadonlyArray<Citation> = [
      {
        ref_id: 'score:a',
        type: 'score',
        label: 'IPV',
        value: 88.2,
        source: 'DMX',
        href: 'https://example.com',
        as_of: '2026-04-01',
      },
    ];
    const result = mod.CitationsList({ citations });
    expect(result).toBeTruthy();
  });
});

describe('CITATION_TYPES contract', () => {
  it('expone los 4 tipos canónicos', async () => {
    const types = await import('@/shared/types/scores');
    expect(types.CITATION_TYPES).toEqual(['score', 'macro', 'geo', 'news']);
  });
});
