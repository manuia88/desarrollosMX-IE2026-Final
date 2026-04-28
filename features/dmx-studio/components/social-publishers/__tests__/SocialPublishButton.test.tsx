// F14.F.12 mini-cleanup — SocialPublishButton tests (Modo A: smoke + module export).

import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

describe('SocialPublishButton — module export contract', () => {
  it('exports SocialPublishButton as named function', async () => {
    const mod = await import('../SocialPublishButton');
    expect(typeof mod.SocialPublishButton).toBe('function');
    expect(mod.SocialPublishButton.name).toBe('SocialPublishButton');
  });

  it('accepts instagram platform with disabled default true', async () => {
    const mod = await import('../SocialPublishButton');
    const sample: Parameters<typeof mod.SocialPublishButton>[0] = {
      platform: 'instagram',
      videoUrl: 'https://example.com/v.mp4',
    };
    expect(sample.platform).toBe('instagram');
  });

  it('accepts tiktok platform', async () => {
    const mod = await import('../SocialPublishButton');
    const sample: Parameters<typeof mod.SocialPublishButton>[0] = {
      platform: 'tiktok',
      videoUrl: '',
    };
    expect(sample.platform).toBe('tiktok');
  });

  it('accepts facebook platform', async () => {
    const mod = await import('../SocialPublishButton');
    const sample: Parameters<typeof mod.SocialPublishButton>[0] = {
      platform: 'facebook',
      videoUrl: '',
      disabled: true,
    };
    expect(sample.platform).toBe('facebook');
    expect(sample.disabled).toBe(true);
  });
});

describe('SocialPublishersSection — module export contract', () => {
  it('exports SocialPublishersSection as named function', async () => {
    const mod = await import('../SocialPublishersSection');
    expect(typeof mod.SocialPublishersSection).toBe('function');
    expect(mod.SocialPublishersSection.name).toBe('SocialPublishersSection');
  });
});

describe('PublishingPlatformCard — module export contract', () => {
  it('exports PublishingPlatformCard as named function', async () => {
    const mod = await import('../PublishingPlatformCard');
    expect(typeof mod.PublishingPlatformCard).toBe('function');
    expect(mod.PublishingPlatformCard.name).toBe('PublishingPlatformCard');
  });
});
