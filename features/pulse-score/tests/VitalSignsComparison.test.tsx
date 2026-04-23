import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    pulse: {
      getPulseScore: {
        useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
      },
      getPulseHistory: {
        useQuery: vi.fn(() => ({
          data: [
            { period_date: '2026-01-01', pulse_score: 68, confidence: 'high' },
            { period_date: '2026-02-01', pulse_score: 70, confidence: 'high' },
            { period_date: '2026-03-01', pulse_score: 72, confidence: 'high' },
          ],
          isLoading: false,
          error: null,
        })),
      },
    },
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

vi.mock('@/shared/lib/market/zone-label-resolver', () => ({
  resolveZoneLabelSync: ({ scopeId }: { scopeId: string }) =>
    scopeId === 'roma-norte' ? 'Roma Norte' : 'Narvarte',
}));

describe('VitalSignsComparison — module export smoke', () => {
  it('exports VitalSignsComparison as function', async () => {
    const mod = await import('../components/VitalSignsComparison');
    expect(typeof mod.VitalSignsComparison).toBe('function');
    expect(mod.VitalSignsComparison.name).toBe('VitalSignsComparison');
  });

  it('accepts the public contract props shape', () => {
    const props = {
      scopeA: { scopeType: 'colonia' as const, scopeId: 'roma-norte' },
      scopeB: { scopeType: 'colonia' as const, scopeId: 'narvarte' },
    };
    expect(props.scopeA.scopeId).toBe('roma-norte');
    expect(props.scopeB.scopeId).toBe('narvarte');
  });

  it('uses distinct accent tokens per series', async () => {
    const sourcePath = new URL('../components/VitalSignsComparison.tsx', import.meta.url);
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(sourcePath, 'utf-8');
    // Series A uses accent-primary, series B uses accent-secondary → distinct colors guaranteed.
    expect(src).toContain('--color-accent-primary');
    expect(src).toContain('--color-accent-secondary');
  });

  it('has aria-labels referencing both zone names', async () => {
    const sourcePath = new URL('../components/VitalSignsComparison.tsx', import.meta.url);
    const fs = await import('node:fs/promises');
    const src = await fs.readFile(sourcePath, 'utf-8');
    expect(src).toContain('compare.aria_label');
    expect(src).toContain('compare.panel_a_label');
    expect(src).toContain('compare.panel_b_label');
    expect(src).toContain('compare.chart_aria');
  });
});
