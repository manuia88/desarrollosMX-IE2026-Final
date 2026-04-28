// F14.F.7 Sprint 6 BIBLIA v4 §6 — Virtual Staging real wrapper tests (replaces F14.F.0 STUB).
// Mock fetch to avoid consuming Pedra credits (verify-before-spend canon).

import { describe, expect, it, vi } from 'vitest';

import {
  batchStage,
  ROOM_TYPES,
  STAGING_STYLES,
  StageRoomInputSchema,
  stageRoom,
  testConnection,
} from '@/features/dmx-studio/lib/virtual-staging';

function buildOkResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

function buildErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response;
}

describe('virtual-staging.testConnection', () => {
  it('returns ok:false when PEDRA_API_KEY missing', async () => {
    const result = await testConnection({ apiKey: '' });
    expect(result.ok).toBe(false);
    expect(result.hasCredentials).toBe(false);
  });

  it('returns ok:true when key configured', async () => {
    const result = await testConnection({ apiKey: 'test-key' });
    expect(result.ok).toBe(true);
    expect(result.hasCredentials).toBe(true);
  });
});

describe('virtual-staging.stageRoom', () => {
  it('rejects invalid input via Zod schema', () => {
    expect(() => StageRoomInputSchema.parse({ imageUrl: 'not-a-url', style: 'modern' })).toThrow();
  });

  it('throws when no API key configured', async () => {
    await expect(
      stageRoom({ imageUrl: 'https://example.com/x.jpg', style: 'modern' }, { apiKey: '' }),
    ).rejects.toThrow(/PEDRA_API_KEY/);
  });

  it('returns staged result on success', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      buildOkResponse({
        job_id: 'pedra_123',
        output_url: 'https://cdn.pedra.so/staged_123.jpg',
      }),
    );
    const result = await stageRoom(
      { imageUrl: 'https://example.com/empty-living.jpg', style: 'modern', roomType: 'living' },
      { fetcher: fetcher as unknown as typeof fetch, apiKey: 'test-key' },
    );
    expect(result.stagedImageUrl).toBe('https://cdn.pedra.so/staged_123.jpg');
    expect(result.pedraJobId).toBe('pedra_123');
    expect(result.style).toBe('modern');
    expect(result.costUsd).toBeGreaterThan(0);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('throws on Pedra API error response', async () => {
    const fetcher = vi.fn().mockResolvedValue(buildErrorResponse(429));
    await expect(
      stageRoom(
        { imageUrl: 'https://example.com/x.jpg', style: 'modern' },
        { fetcher: fetcher as unknown as typeof fetch, apiKey: 'test-key' },
      ),
    ).rejects.toThrow(/Pedra API error 429/);
  });
});

describe('virtual-staging.batchStage', () => {
  it('processes multiple images in parallel', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { image_url: string };
      return buildOkResponse({
        job_id: `pedra_${body.image_url.slice(-5)}`,
        output_url: `https://cdn.pedra.so/staged_${body.image_url.slice(-5)}.jpg`,
      });
    });
    const result = await batchStage(
      {
        images: [
          'https://example.com/r1.jpg',
          'https://example.com/r2.jpg',
          'https://example.com/r3.jpg',
        ],
        style: 'minimalist',
      },
      { fetcher: fetcher as unknown as typeof fetch, apiKey: 'test-key' },
    );
    expect(result.batchId).toBeTruthy();
    expect(result.jobs).toHaveLength(3);
    expect(result.totalCostUsd).toBeGreaterThan(0);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('captures individual failures without breaking batch', async () => {
    const fetcher = vi.fn().mockImplementation(async (_url, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { image_url: string };
      if (body.image_url.includes('fail')) return buildErrorResponse(500);
      return buildOkResponse({ job_id: 'ok', output_url: 'https://cdn.pedra.so/ok.jpg' });
    });
    const result = await batchStage(
      {
        images: ['https://example.com/ok.jpg', 'https://example.com/fail.jpg'],
        style: 'modern',
      },
      { fetcher: fetcher as unknown as typeof fetch, apiKey: 'test-key' },
    );
    expect(result.jobs[0]?.stagedImageUrl).toBeTruthy();
    expect(result.jobs[1]?.error).toBeTruthy();
  });
});

describe('virtual-staging canon constants', () => {
  it('exposes 7 staging styles', () => {
    expect(STAGING_STYLES.length).toBe(7);
    expect(STAGING_STYLES).toContain('modern');
    expect(STAGING_STYLES).toContain('luxury');
  });

  it('exposes 9 room types', () => {
    expect(ROOM_TYPES.length).toBe(9);
    expect(ROOM_TYPES).toContain('living');
    expect(ROOM_TYPES).toContain('outdoor');
  });
});
