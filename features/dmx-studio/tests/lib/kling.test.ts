// DMX Studio dentro DMX único entorno (ADR-054). Kling wrapper unit tests.

import type Replicate from 'replicate';
import { describe, expect, it, vi } from 'vitest';
import {
  GenerateVideoFromImageInputSchema,
  generateVideoFromImage,
  testConnection,
} from '@/features/dmx-studio/lib/kling';

type MockReplicate = {
  run: ReturnType<typeof vi.fn>;
  models: { list: ReturnType<typeof vi.fn> };
};

function buildMockClient(overrides?: Partial<MockReplicate>): MockReplicate {
  return {
    run: vi.fn(),
    models: { list: vi.fn() },
    ...overrides,
  };
}

describe('kling.testConnection', () => {
  it('returns ok:true and modelsAvailable count on success', async () => {
    const mock = buildMockClient();
    mock.models.list.mockResolvedValue({
      results: [{ owner: 'a' }, { owner: 'b' }, { owner: 'c' }],
    });
    const result = await testConnection({ client: mock as unknown as Replicate });
    expect(result.ok).toBe(true);
    expect(result.modelsAvailable).toBe(3);
    expect(mock.models.list).toHaveBeenCalledOnce();
  });

  it('returns ok:false and error message on failure', async () => {
    const mock = buildMockClient();
    mock.models.list.mockRejectedValue(new Error('Unauthorized'));
    const result = await testConnection({ client: mock as unknown as Replicate });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Unauthorized');
  });
});

describe('kling.generateVideoFromImage', () => {
  it('rejects invalid input via Zod schema', () => {
    expect(() =>
      GenerateVideoFromImageInputSchema.parse({
        imageUrl: 'not-a-url',
        prompt: '',
      }),
    ).toThrow();
  });

  it('returns videoUrl from successful prediction (array output)', async () => {
    const mock = buildMockClient();
    mock.run.mockResolvedValue(['https://example.com/video.mp4']);
    const result = await generateVideoFromImage(
      {
        imageUrl: 'https://example.com/photo.jpg',
        prompt: 'Cinematic pan across modern living room',
        cameraMovement: 'pan_left',
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
      { client: mock as unknown as Replicate },
    );
    expect(result.videoUrl).toBe('https://example.com/video.mp4');
    expect(result.durationSeconds).toBe(5);
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.model).toContain('kling');
    expect(result.requestId).toMatch(/^kling_/);
    expect(mock.run).toHaveBeenCalledOnce();
  });
});
