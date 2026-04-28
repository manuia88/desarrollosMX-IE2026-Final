// F14.F.12 mini-cleanup — Social publishers STUB ADR-018 throw NOT_IMPLEMENTED.
// Cada publisher (3) debe throw TRPCError NOT_IMPLEMENTED en publish + getOAuthUrl
// con mensaje containing "STUB ADR-018" (heurística audit-dead-ui).

import { describe, expect, it } from 'vitest';
import { getPublisher, type SocialPlatform } from '@/features/dmx-studio/lib/social-publishers';

const PLATFORMS: ReadonlyArray<SocialPlatform> = ['instagram', 'tiktok', 'facebook'];

describe('social publishers STUB ADR-018 — publish throws NOT_IMPLEMENTED', () => {
  for (const platform of PLATFORMS) {
    it(`${platform}: publish() throws TRPCError NOT_IMPLEMENTED with STUB ADR-018 message`, async () => {
      const publisher = getPublisher(platform);
      await expect(
        publisher.publish({
          videoUrl: 'https://example.com/video.mp4',
          caption: 'test',
          hashtags: [],
          accessToken: 'noop',
        }),
      ).rejects.toMatchObject({
        code: 'NOT_IMPLEMENTED',
        message: expect.stringContaining('STUB ADR-018'),
      });
    });
  }
});

describe('social publishers STUB ADR-018 — getOAuthUrl throws NOT_IMPLEMENTED', () => {
  for (const platform of PLATFORMS) {
    it(`${platform}: getOAuthUrl() throws TRPCError NOT_IMPLEMENTED with STUB ADR-018 message`, async () => {
      const publisher = getPublisher(platform);
      await expect(
        publisher.getOAuthUrl({
          redirectUri: 'https://desarrollosmx.com/callback',
          state: 'state-123',
        }),
      ).rejects.toMatchObject({
        code: 'NOT_IMPLEMENTED',
        message: expect.stringContaining('STUB ADR-018'),
      });
    });
  }
});

describe('social publishers STUB ADR-018 — getStatus throws NOT_IMPLEMENTED', () => {
  for (const platform of PLATFORMS) {
    it(`${platform}: getStatus() throws TRPCError NOT_IMPLEMENTED`, async () => {
      const publisher = getPublisher(platform);
      await expect(
        publisher.getStatus({
          postId: 'post-123',
          accessToken: 'noop',
        }),
      ).rejects.toMatchObject({
        code: 'NOT_IMPLEMENTED',
        message: expect.stringContaining('STUB ADR-018'),
      });
    });
  }
});

describe('social publishers STUB ADR-018 — exchangeCode throws NOT_IMPLEMENTED', () => {
  for (const platform of PLATFORMS) {
    it(`${platform}: exchangeCode() throws TRPCError NOT_IMPLEMENTED`, async () => {
      const publisher = getPublisher(platform);
      await expect(
        publisher.exchangeCode({
          code: 'auth-code-123',
          redirectUri: 'https://desarrollosmx.com/callback',
        }),
      ).rejects.toMatchObject({
        code: 'NOT_IMPLEMENTED',
        message: expect.stringContaining('STUB ADR-018'),
      });
    });
  }
});

describe('social publishers STUB ADR-018 — L-NEW pointer per platform', () => {
  it('instagram message contains L-NEW pointer', async () => {
    const publisher = getPublisher('instagram');
    await expect(
      publisher.publish({ videoUrl: '', caption: '', hashtags: [], accessToken: '' }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('L-NEW-STUDIO-INSTAGRAM-PUBLISH-ACTIVATE'),
    });
  });

  it('tiktok message contains L-NEW pointer', async () => {
    const publisher = getPublisher('tiktok');
    await expect(
      publisher.publish({ videoUrl: '', caption: '', hashtags: [], accessToken: '' }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('L-NEW-STUDIO-TIKTOK-PUBLISH-ACTIVATE'),
    });
  });

  it('facebook message contains L-NEW pointer', async () => {
    const publisher = getPublisher('facebook');
    await expect(
      publisher.publish({ videoUrl: '', caption: '', hashtags: [], accessToken: '' }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('L-NEW-STUDIO-FACEBOOK-PUBLISH-ACTIVATE'),
    });
  });
});
