// F14.F.12 mini-cleanup — Social publishers registry resolver tests.

import { describe, expect, it } from 'vitest';
import {
  getPublisher,
  getSupportedPlatforms,
  type SocialPlatform,
} from '@/features/dmx-studio/lib/social-publishers';

describe('socialPublishers — registry resolver', () => {
  it('getSupportedPlatforms returns 3 platforms', () => {
    const platforms = getSupportedPlatforms();
    expect(platforms.length).toBe(3);
    expect(platforms).toContain('instagram');
    expect(platforms).toContain('tiktok');
    expect(platforms).toContain('facebook');
  });

  it('getPublisher(instagram) returns ISocialPublisher implementation', () => {
    const publisher = getPublisher('instagram');
    expect(publisher.platform).toBe('instagram');
    expect(typeof publisher.publish).toBe('function');
    expect(typeof publisher.getStatus).toBe('function');
    expect(typeof publisher.getOAuthUrl).toBe('function');
    expect(typeof publisher.exchangeCode).toBe('function');
  });

  it('getPublisher(tiktok) returns ISocialPublisher implementation', () => {
    const publisher = getPublisher('tiktok');
    expect(publisher.platform).toBe('tiktok');
    expect(typeof publisher.publish).toBe('function');
  });

  it('getPublisher(facebook) returns ISocialPublisher implementation', () => {
    const publisher = getPublisher('facebook');
    expect(publisher.platform).toBe('facebook');
    expect(typeof publisher.publish).toBe('function');
  });

  it('registry completeness — every supported platform has a publisher', () => {
    const platforms = getSupportedPlatforms();
    for (const platform of platforms) {
      const publisher = getPublisher(platform satisfies SocialPlatform);
      expect(publisher).toBeDefined();
      expect(publisher.platform).toBe(platform);
    }
  });
});
