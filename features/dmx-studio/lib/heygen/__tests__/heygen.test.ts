import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAvatar,
  deleteAvatar,
  generateAvatarClip,
  getAvatarStatus,
  listAvatars,
  testConnection,
} from '../index';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.HEYGEN_API_KEY;
const ORIGINAL_FLAG = process.env.HEYGEN_AVATAR_ENABLED;

function mockFetch(payload: unknown, ok = true, status = 200): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response);
}

describe('heygen wrapper', () => {
  beforeEach(() => {
    process.env.HEYGEN_API_KEY = 'test-key';
    process.env.HEYGEN_AVATAR_ENABLED = 'true';
  });
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env.HEYGEN_API_KEY = ORIGINAL_KEY;
    process.env.HEYGEN_AVATAR_ENABLED = ORIGINAL_FLAG;
    vi.restoreAllMocks();
  });

  it('createAvatar posts payload + normalizes ready status', async () => {
    mockFetch({ data: { avatar_id: 'av_123', status: 'ready' } });
    const result = await createAvatar({
      photoUrl: 'https://photo.png',
      voiceSampleUrl: 'https://voice.mp3',
      name: 'Manu Avatar',
    });
    expect(result.avatarId).toBe('av_123');
    expect(result.status).toBe('ready');
  });

  it('createAvatar normalizes processing status variants', async () => {
    mockFetch({ data: { avatar_id: 'av_456', status: 'in_progress' } });
    const result = await createAvatar({
      photoUrl: 'https://x.png',
      voiceSampleUrl: 'https://x.mp3',
      name: 'X',
    });
    expect(result.status).toBe('processing');
  });

  it('getAvatarStatus returns failed on error response status', async () => {
    mockFetch({ data: { status: 'failed' } });
    const result = await getAvatarStatus('av_xyz');
    expect(result).toBe('failed');
  });

  it('generateAvatarClip estimates cost based on script length', async () => {
    mockFetch({ data: { video_id: 'v_1', status: 'pending' } });
    const result = await generateAvatarClip({
      avatarId: 'av_1',
      script: 'Hola, te muestro este lindo departamento en Roma Norte.',
      aspectRatio: '9:16',
      variantStyle: 'casual',
    });
    expect(result.videoId).toBe('v_1');
    expect(result.costUsd).toBeGreaterThan(0);
    expect(result.status).toBe('pending');
  });

  it('listAvatars maps response to internal shape', async () => {
    mockFetch({
      data: {
        avatars: [
          { avatar_id: 'a1', avatar_name: 'Manu', status: 'ready' },
          { avatar_id: 'a2', avatar_name: 'Sofi', status: 'processing' },
        ],
      },
    });
    const result = await listAvatars();
    expect(result.avatars).toHaveLength(2);
    expect(result.avatars[0]?.id).toBe('a1');
    expect(result.avatars[1]?.status).toBe('processing');
  });

  it('deleteAvatar returns deleted true on success', async () => {
    mockFetch({ ok: true });
    const result = await deleteAvatar('av_to_remove');
    expect(result.deleted).toBe(true);
  });

  it('testConnection returns ok=false sin API key', async () => {
    process.env.HEYGEN_API_KEY = '';
    const result = await testConnection();
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/HEYGEN_API_KEY/);
  });

  it('testConnection returns ok=true con account info válido', async () => {
    mockFetch({ data: { remaining_quota: 1000, avatars_count: 3 } });
    const result = await testConnection();
    expect(result.ok).toBe(true);
    expect(result.accountInfo?.remainingCredits).toBe(1000);
    expect(result.accountInfo?.avatarsCount).toBe(3);
  });

  it('feature flag desactivado bloquea createAvatar', async () => {
    process.env.HEYGEN_AVATAR_ENABLED = 'false';
    await expect(
      createAvatar({
        photoUrl: 'x',
        voiceSampleUrl: 'y',
        name: 'z',
      }),
    ).rejects.toThrow(/feature flag/i);
  });

  it('HeyGen 4xx responses se traducen en TRPCError', async () => {
    mockFetch({ error: 'invalid' }, false, 400);
    await expect(createAvatar({ photoUrl: 'x', voiceSampleUrl: 'y', name: 'z' })).rejects.toThrow(
      /HeyGen API 400/,
    );
  });
});
