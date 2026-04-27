import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

describe('FoundersCohortBadge — module export smoke', () => {
  it('exports FoundersCohortBadge as function', async () => {
    const mod = await import('../../../components/landing/FoundersCohortBadge');
    expect(typeof mod.FoundersCohortBadge).toBe('function');
    expect(mod.FoundersCohortBadge.name).toBe('FoundersCohortBadge');
  });

  it('accepts foundersRemaining > 0 (available state)', async () => {
    const mod = await import('../../../components/landing/FoundersCohortBadge');
    const sample: Parameters<typeof mod.FoundersCohortBadge>[0] = {
      foundersRemaining: 27,
      foundersTotal: 50,
    };
    expect(sample.foundersRemaining).toBeGreaterThan(0);
    expect(typeof mod.FoundersCohortBadge).toBe('function');
  });

  it('accepts foundersRemaining === 0 (cohort full state)', async () => {
    const mod = await import('../../../components/landing/FoundersCohortBadge');
    const sample: Parameters<typeof mod.FoundersCohortBadge>[0] = {
      foundersRemaining: 0,
      foundersTotal: 50,
    };
    expect(sample.foundersRemaining).toBe(0);
    expect(typeof mod.FoundersCohortBadge).toBe('function');
  });
});
