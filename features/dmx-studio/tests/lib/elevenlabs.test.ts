// DMX Studio dentro DMX único entorno (ADR-054). ElevenLabs wrapper unit tests.

import type { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cloneVoice,
  GenerateSpeechInputSchema,
  generateSpeech,
  getCanonVoices,
  testConnection,
} from '@/features/dmx-studio/lib/elevenlabs';

function buildAudioStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

type MockElevenLabsClient = {
  textToSpeech: { convert: ReturnType<typeof vi.fn> };
  music: { compose: ReturnType<typeof vi.fn> };
  voices: { ivc: { create: ReturnType<typeof vi.fn> } };
  user: { get: ReturnType<typeof vi.fn> };
};

function buildMockClient(): MockElevenLabsClient {
  return {
    textToSpeech: { convert: vi.fn() },
    music: { compose: vi.fn() },
    voices: { ivc: { create: vi.fn() } },
    user: { get: vi.fn() },
  };
}

beforeEach(() => {
  vi.stubEnv('ELEVENLABS_VOICE_CLONE_ENABLED', 'false');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('elevenlabs.testConnection', () => {
  it('returns subscription info + voiceCloneAvailable flag on success', async () => {
    const mock = buildMockClient();
    mock.user.get.mockResolvedValue({
      userId: 'u1',
      subscription: { tier: 'free', characterCount: 1000, characterLimit: 10000 },
    });
    const result = await testConnection({ client: mock as unknown as ElevenLabsClient });
    expect(result.ok).toBe(true);
    expect(result.subscriptionTier).toBe('free');
    expect(result.characterBalance).toBe(9000);
    expect(result.voiceCloneAvailable).toBe(false);
  });

  it('returns ok:false on failure', async () => {
    const mock = buildMockClient();
    mock.user.get.mockRejectedValue(new Error('401 unauthorized'));
    const result = await testConnection({ client: mock as unknown as ElevenLabsClient });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('401 unauthorized');
  });
});

describe('elevenlabs.generateSpeech', () => {
  it('rejects invalid input via schema', () => {
    expect(() =>
      GenerateSpeechInputSchema.parse({
        text: '',
      }),
    ).toThrow();
  });

  it('returns audioBuffer + cost estimate on success', async () => {
    const mock = buildMockClient();
    const fakeBytes = new Uint8Array([1, 2, 3, 4, 5]);
    mock.textToSpeech.convert.mockResolvedValue(buildAudioStream(fakeBytes));
    const result = await generateSpeech(
      {
        text: 'Hola mundo desde DMX Studio',
        modelId: 'eleven_flash_v2_5',
      },
      { client: mock as unknown as ElevenLabsClient },
    );
    expect(result.audioBuffer).toBeInstanceOf(Uint8Array);
    expect(result.audioBuffer.byteLength).toBe(fakeBytes.byteLength);
    expect(result.costUsd).toBeGreaterThanOrEqual(0);
    expect(result.durationSecondsEstimate).toBeGreaterThan(0);
    expect(mock.textToSpeech.convert).toHaveBeenCalledOnce();
  });
});

describe('elevenlabs.cloneVoice', () => {
  it('throws when ELEVENLABS_VOICE_CLONE_ENABLED=false (default canon)', async () => {
    const mock = buildMockClient();
    await expect(
      cloneVoice(
        {
          name: 'Test voice',
          audioSampleUrls: ['https://example.com/sample.mp3'],
        },
        { client: mock as unknown as ElevenLabsClient },
      ),
    ).rejects.toThrow(/Voice cloning disabled/);
    expect(mock.voices.ivc.create).not.toHaveBeenCalled();
  });
});

describe('elevenlabs.getCanonVoices', () => {
  it('returns 3 voces ES-LATAM canon', async () => {
    const voices = await getCanonVoices();
    expect(voices).toHaveLength(3);
    expect(voices.every((v) => v.accent === 'es-LATAM')).toBe(true);
    expect(voices.map((v) => v.id)).toContain('21m00Tcm4TlvDq8ikWAM');
  });
});
