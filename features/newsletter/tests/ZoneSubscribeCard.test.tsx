import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => 'es-MX',
}));

describe('ZoneSubscribeCard — module exports', () => {
  it('exports ZoneSubscribeCard as function', async () => {
    const mod = await import('@/features/newsletter/components/ZoneSubscribeCard');
    expect(typeof mod.ZoneSubscribeCard).toBe('function');
    expect(mod.ZoneSubscribeCard.name).toBe('ZoneSubscribeCard');
  });

  it('accepts required props shape', async () => {
    const mod = await import('@/features/newsletter/components/ZoneSubscribeCard');
    const props = {
      zoneLabel: 'Roma Norte',
      sourceScopeId: 'roma-norte',
      locale: 'es-MX',
    };
    expect(props.zoneLabel).toBe('Roma Norte');
    expect(typeof mod.ZoneSubscribeCard).toBe('function');
  });
});

describe('NewsletterPreferencesForm — module exports', () => {
  it('exports NewsletterPreferencesForm as function', async () => {
    const mod = await import('@/features/newsletter/components/NewsletterPreferencesForm');
    expect(typeof mod.NewsletterPreferencesForm).toBe('function');
    expect(mod.NewsletterPreferencesForm.name).toBe('NewsletterPreferencesForm');
  });
});
