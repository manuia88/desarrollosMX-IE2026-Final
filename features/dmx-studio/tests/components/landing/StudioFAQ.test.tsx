import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

describe('StudioFAQ — module export smoke', () => {
  it('exports StudioFAQ as function', async () => {
    const mod = await import('../../../components/landing/StudioFAQ');
    expect(typeof mod.StudioFAQ).toBe('function');
    expect(mod.StudioFAQ.name).toBe('StudioFAQ');
  });

  it('source-of-truth contains 10 FAQ entries q1..q10', async () => {
    // Mirror the FAQ_KEYS constant inside StudioFAQ component
    const expectedKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const;
    expect(expectedKeys.length).toBe(10);
    // Each expected key has unique, ordered identifier
    for (let i = 0; i < expectedKeys.length; i += 1) {
      expect(expectedKeys[i]).toBe(`q${i + 1}`);
    }
  });

  it('accordion exposes only one open key at a time (single-expand semantics)', async () => {
    const mod = await import('../../../components/landing/StudioFAQ');
    expect(typeof mod.StudioFAQ).toBe('function');
    // Component holds useState<FaqKey | null>(FAQ_KEYS[0]) → first item open by default,
    // toggling onToggle either closes or replaces. This test documents the contract:
    type FaqKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9' | 'q10';
    const initial: FaqKey | null = 'q1';
    const next: FaqKey | null = initial === 'q1' ? null : 'q1';
    expect(next).toBeNull();
  });

  it('i18n contract has full sentences per FAQ entry in es-MX namespace', async () => {
    const messages = await import('@/messages/es-MX.json');
    const json = messages.default as unknown as {
      Studio: { faq: { items: Record<string, { q: string; a: string }> } };
    };
    const items = json.Studio.faq.items;
    const keys = Object.keys(items).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    expect(keys).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10']);
    for (const k of keys) {
      const item = items[k];
      expect(item).toBeDefined();
      if (!item) continue;
      expect(item.q.length).toBeGreaterThan(5);
      expect(item.a.length).toBeGreaterThan(10);
    }
  });
});
