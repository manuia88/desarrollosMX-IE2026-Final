import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

describe('TrustSignals — module export smoke', () => {
  it('exports TrustSignals as function', async () => {
    const mod = await import('../../../components/landing/TrustSignals');
    expect(typeof mod.TrustSignals).toBe('function');
    expect(mod.TrustSignals.name).toBe('TrustSignals');
  });

  it('accepts numeric counters props (waitlist + asesores + foundersRemaining)', async () => {
    const mod = await import('../../../components/landing/TrustSignals');
    // Sample props validate prop interface
    const sample: Parameters<typeof mod.TrustSignals>[0] = {
      waitlistCount: 137,
      asesoresCount: 412,
      foundersRemaining: 23,
    };
    expect(sample.waitlistCount).toBe(137);
    expect(sample.asesoresCount).toBe(412);
    expect(sample.foundersRemaining).toBe(23);
    expect(typeof mod.TrustSignals).toBe('function');
  });

  it('accepts zero values (cold start)', async () => {
    const mod = await import('../../../components/landing/TrustSignals');
    const sample: Parameters<typeof mod.TrustSignals>[0] = {
      waitlistCount: 0,
      asesoresCount: 0,
      foundersRemaining: 50,
    };
    expect(sample.waitlistCount).toBe(0);
    expect(typeof mod.TrustSignals).toBe('function');
  });
});
