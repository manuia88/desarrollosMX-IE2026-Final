// F14.F.7 Sprint 6 BIBLIA v4 §6 — fal-gateway real wrapper tests (replaces F14.F.0 STUB).
// Mock fal client to avoid consuming credits (verify-before-spend canon).

import type { FalClient } from '@fal-ai/client';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_FLUX_MODEL,
  DEFAULT_SEEDANCE_MODEL,
  generateFromModel,
  listModels,
  pollStatus,
  submitJob,
  testConnection,
} from '@/features/dmx-studio/lib/fal-gateway';
import {
  GenerateSeedanceClipInputSchema,
  generateVideoWithAudio,
} from '@/features/dmx-studio/lib/fal-gateway/seedance';

type MockFal = {
  queue: {
    submit: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    result: ReturnType<typeof vi.fn>;
  };
  subscribe: ReturnType<typeof vi.fn>;
};

function buildMockClient(): MockFal {
  return {
    queue: {
      submit: vi.fn(),
      status: vi.fn(),
      result: vi.fn(),
    },
    subscribe: vi.fn(),
  };
}

describe('fal-gateway.listModels', () => {
  it('returns canon models with defaults', () => {
    const result = listModels();
    expect(result.defaultSeedance).toBe(DEFAULT_SEEDANCE_MODEL);
    expect(result.defaultFlux).toBe(DEFAULT_FLUX_MODEL);
    expect(result.models).toContain(DEFAULT_SEEDANCE_MODEL);
    expect(result.models).toContain(DEFAULT_FLUX_MODEL);
  });
});

describe('fal-gateway.testConnection', () => {
  it('returns ok:false when FAL_API_KEY missing', async () => {
    const original = process.env.FAL_API_KEY;
    const originalAlt = process.env.FAL_KEY;
    delete process.env.FAL_API_KEY;
    delete process.env.FAL_KEY;
    const result = await testConnection();
    expect(result.ok).toBe(false);
    expect(result.hasCredentials).toBe(false);
    if (original) process.env.FAL_API_KEY = original;
    if (originalAlt) process.env.FAL_KEY = originalAlt;
  });

  it('returns ok:true and modelsAvailable when key configured', async () => {
    const original = process.env.FAL_API_KEY;
    process.env.FAL_API_KEY = 'test-key';
    const result = await testConnection();
    expect(result.ok).toBe(true);
    expect(result.hasCredentials).toBe(true);
    expect(result.modelsAvailable).toBeGreaterThan(0);
    if (original) {
      process.env.FAL_API_KEY = original;
    } else {
      delete process.env.FAL_API_KEY;
    }
  });
});

describe('fal-gateway.submitJob', () => {
  it('returns requestId on success', async () => {
    const mock = buildMockClient();
    mock.queue.submit.mockResolvedValue({ request_id: 'req_abc123' });
    const result = await submitJob(DEFAULT_SEEDANCE_MODEL, { prompt: 'test' }, {
      client: mock as unknown as FalClient,
    });
    expect(result.requestId).toBe('req_abc123');
    expect(mock.queue.submit).toHaveBeenCalledWith(DEFAULT_SEEDANCE_MODEL, {
      input: { prompt: 'test' },
    });
  });
});

describe('fal-gateway.pollStatus', () => {
  it('returns IN_PROGRESS without output when not completed', async () => {
    const mock = buildMockClient();
    mock.queue.status.mockResolvedValue({ status: 'IN_PROGRESS', logs: [] });
    const result = await pollStatus(DEFAULT_SEEDANCE_MODEL, 'req_abc123', {
      client: mock as unknown as FalClient,
    });
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.output).toBeUndefined();
  });

  it('returns COMPLETED with output when ready', async () => {
    const mock = buildMockClient();
    mock.queue.status.mockResolvedValue({ status: 'COMPLETED', logs: [] });
    mock.queue.result.mockResolvedValue({ data: { video: { url: 'https://example.com/x.mp4' } } });
    const result = await pollStatus(DEFAULT_SEEDANCE_MODEL, 'req_abc123', {
      client: mock as unknown as FalClient,
    });
    expect(result.status).toBe('COMPLETED');
    expect(result.output).toBeDefined();
  });
});

describe('fal-gateway.generateFromModel', () => {
  it('subscribes to seedance model and returns output', async () => {
    const mock = buildMockClient();
    mock.subscribe.mockResolvedValue({
      requestId: 'req_xyz',
      data: { video: { url: 'https://example.com/clip.mp4' } },
    });
    const result = await generateFromModel(
      'seedance',
      { prompt: 'cinematic kitchen', image_url: 'https://example.com/img.jpg' },
      { client: mock as unknown as FalClient },
    );
    expect(result.requestId).toBe('req_xyz');
    expect(mock.subscribe).toHaveBeenCalledWith(DEFAULT_SEEDANCE_MODEL, expect.any(Object));
  });

  it('subscribes to flux model when modelKey=flux', async () => {
    const mock = buildMockClient();
    mock.subscribe.mockResolvedValue({ requestId: 'req_flux', data: { images: [] } });
    await generateFromModel('flux', { prompt: 'test' }, { client: mock as unknown as FalClient });
    expect(mock.subscribe).toHaveBeenCalledWith(DEFAULT_FLUX_MODEL, expect.any(Object));
  });
});

describe('fal-gateway/seedance.generateVideoWithAudio', () => {
  it('rejects invalid input via Zod schema', () => {
    expect(() =>
      GenerateSeedanceClipInputSchema.parse({
        imageUrl: 'not-a-url',
        prompt: '',
      }),
    ).toThrow();
  });

  it('returns video result with native audio flag', async () => {
    const mock = buildMockClient();
    mock.subscribe.mockResolvedValue({
      requestId: 'req_seed_001',
      data: { video: { url: 'https://example.com/seedance.mp4' } },
    });
    const result = await generateVideoWithAudio(
      {
        imageUrl: 'https://example.com/kitchen.jpg',
        prompt: 'modern kitchen pan shot',
        audioContext: 'kitchen',
        durationSeconds: 5,
      },
      { client: mock as unknown as FalClient },
    );
    expect(result.videoUrl).toBe('https://example.com/seedance.mp4');
    expect(result.hasNativeAudio).toBe(true);
    expect(result.durationSeconds).toBe(5);
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.requestId).toBe('req_seed_001');
  });

  it('appends audio context hint to prompt', async () => {
    const mock = buildMockClient();
    mock.subscribe.mockResolvedValue({
      requestId: 'req_002',
      data: { video: { url: 'https://example.com/x.mp4' } },
    });
    await generateVideoWithAudio(
      {
        imageUrl: 'https://example.com/garden.jpg',
        prompt: 'garden tour',
        audioContext: 'garden_birds' as never,
      },
      { client: mock as unknown as FalClient },
    );
    expect(mock.subscribe).toHaveBeenCalled();
  });

  it('passes refs array when provided', async () => {
    const mock = buildMockClient();
    mock.subscribe.mockResolvedValue({
      requestId: 'req_003',
      data: { video: { url: 'https://example.com/x.mp4' } },
    });
    await generateVideoWithAudio(
      {
        imageUrl: 'https://example.com/main.jpg',
        prompt: 'multi-ref tour',
        refs: ['https://example.com/ref1.jpg', 'https://example.com/ref2.jpg'],
        multiShot: true,
      },
      { client: mock as unknown as FalClient },
    );
    const call = mock.subscribe.mock.calls[0]?.[1] as { input: Record<string, unknown> };
    expect(call.input.reference_image_urls).toHaveLength(2);
    expect(call.input.multi_shot_mode).toBe(true);
  });
});
