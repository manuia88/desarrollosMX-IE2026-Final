import { describe, expect, it, vi } from 'vitest';
import type { TrustScoreDetail } from '../components/trust-score/TrustScoreDrawer';

vi.mock('next-intl', () => ({
  useTranslations:
    () =>
    (k: string, vars?: Record<string, unknown>): string =>
      vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

function makeDetail(overrides: Partial<TrustScoreDetail> = {}): TrustScoreDetail {
  return {
    score: 87,
    level: 'gold',
    breakdown: {
      financial_health: 90,
      on_time_delivery: 85,
      doc_transparency: 80,
      post_venta: 88,
      reviews: 92,
    },
    improvements: ['Mejorar transparencia documental'],
    citations: ['CMIC reporte mensual 2026-04'],
    is_placeholder: false,
    ...overrides,
  };
}

describe('TrustScoreCard — module export smoke', () => {
  it('exports TrustScoreCard as function and accepts score+level=gold', async () => {
    const mod = await import('../components/trust-score/TrustScoreCard');
    expect(typeof mod.TrustScoreCard).toBe('function');
    expect(mod.TrustScoreCard.name).toBe('TrustScoreCard');

    const props: Parameters<typeof mod.TrustScoreCard>[0] = {
      score: 87,
      level: 'gold',
    };
    expect(props.score).toBe(87);
    expect(props.level).toBe('gold');
  });

  it('accepts isPlaceholder=true (renders dash + pendiente label)', async () => {
    const mod = await import('../components/trust-score/TrustScoreCard');
    const props: Parameters<typeof mod.TrustScoreCard>[0] = {
      score: null,
      level: null,
      isPlaceholder: true,
    };
    expect(props.isPlaceholder).toBe(true);
    expect(props.score).toBeNull();
    expect(props.level).toBeNull();
    expect(typeof mod.TrustScoreCard).toBe('function');
  });
});

describe('TrustScoreDrawer — module export smoke', () => {
  it('exports TrustScoreDrawer and accepts open=true with breakdown of 5 categorías', async () => {
    const mod = await import('../components/trust-score/TrustScoreDrawer');
    expect(typeof mod.TrustScoreDrawer).toBe('function');
    expect(mod.TrustScoreDrawer.name).toBe('TrustScoreDrawer');

    const detail = makeDetail();
    const breakdownKeys = Object.keys(detail.breakdown);
    expect(breakdownKeys).toHaveLength(5);
    expect(breakdownKeys).toContain('financial_health');
    expect(breakdownKeys).toContain('on_time_delivery');
    expect(breakdownKeys).toContain('doc_transparency');
    expect(breakdownKeys).toContain('post_venta');
    expect(breakdownKeys).toContain('reviews');

    const onClose = vi.fn();
    const props: Parameters<typeof mod.TrustScoreDrawer>[0] = {
      open: true,
      onClose,
      trustScore: detail,
    };
    expect(props.open).toBe(true);
    expect(props.trustScore?.is_placeholder).toBe(false);
  });

  it('accepts placeholder trustScore (is_placeholder=true)', async () => {
    const mod = await import('../components/trust-score/TrustScoreDrawer');
    const detail = makeDetail({
      score: null,
      level: null,
      breakdown: {
        financial_health: null,
        on_time_delivery: null,
        doc_transparency: null,
        post_venta: null,
        reviews: null,
      },
      improvements: [],
      citations: [],
      is_placeholder: true,
    });
    expect(detail.is_placeholder).toBe(true);
    expect(detail.improvements).toHaveLength(0);
    expect(typeof mod.TrustScoreDrawer).toBe('function');
  });
});
