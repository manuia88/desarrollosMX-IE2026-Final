// F14.F.8 Sprint 7 BIBLIA — HeyGen real wrapper (Tarea 7.1 Avatar IA).
// Activado 2026-04-27 reemplazando STUB F14.F.0. Gated por HEYGEN_AVATAR_ENABLED canon.
// Verify-before-spend: feature flag false default. testConnection() es read-only (NO credits).

import { TRPCError } from '@trpc/server';

const HEYGEN_BASE_V2 = 'https://api.heygen.com/v2';
const HEYGEN_BASE_V1 = 'https://api.heygen.com/v1';

export type AvatarStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface CreateAvatarInput {
  readonly photoUrl: string;
  readonly voiceSampleUrl: string;
  readonly name: string;
}

export interface CreateAvatarResult {
  readonly avatarId: string;
  readonly status: AvatarStatus;
}

export interface GenerateClipInput {
  readonly avatarId: string;
  readonly script: string;
  readonly voiceId?: string;
  readonly aspectRatio?: '9:16' | '1:1' | '16:9' | '4:5';
  readonly variantStyle?: 'formal' | 'casual' | 'branded';
}

export interface GenerateClipResult {
  readonly videoId: string;
  readonly videoUrl: string | null;
  readonly costUsd: number;
  readonly status: 'pending' | 'completed' | 'failed';
}

export interface ListAvatarsResult {
  readonly avatars: ReadonlyArray<{ id: string; name: string; status: AvatarStatus }>;
}

export interface TestConnectionResult {
  readonly ok: boolean;
  readonly reason?: string;
  readonly accountInfo?: { remainingCredits: number; avatarsCount: number };
}

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'HEYGEN_API_KEY no configurado en entorno.',
    });
  }
  return key;
}

function ensureFeatureEnabled(): void {
  if (process.env.HEYGEN_AVATAR_ENABLED !== 'true') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'HeyGen avatar feature flag desactivada. HEYGEN_AVATAR_ENABLED=true para activar.',
    });
  }
}

async function heygenFetch<T>(
  path: string,
  init: RequestInit,
  baseUrl: string = HEYGEN_BASE_V2,
): Promise<T> {
  const apiKey = getApiKey();
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Api-Key': apiKey,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: `HeyGen API ${response.status}: ${text.slice(0, 256)}`,
    });
  }
  return (await response.json()) as T;
}

export async function createAvatar(input: CreateAvatarInput): Promise<CreateAvatarResult> {
  ensureFeatureEnabled();
  const payload = {
    name: input.name,
    photo_url: input.photoUrl,
    voice_sample_url: input.voiceSampleUrl,
  };
  const data = await heygenFetch<{
    data: { avatar_id: string; status: string };
  }>('/photo_avatar/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    avatarId: data.data.avatar_id,
    status: normalizeStatus(data.data.status),
  };
}

export async function getAvatarStatus(avatarId: string): Promise<AvatarStatus> {
  ensureFeatureEnabled();
  const data = await heygenFetch<{ data: { status: string } }>(
    `/photo_avatar/${encodeURIComponent(avatarId)}`,
    { method: 'GET' },
  );
  return normalizeStatus(data.data.status);
}

export async function generateAvatarClip(input: GenerateClipInput): Promise<GenerateClipResult> {
  ensureFeatureEnabled();
  const aspectMap: Record<NonNullable<GenerateClipInput['aspectRatio']>, string> = {
    '9:16': '9:16',
    '1:1': '1:1',
    '16:9': '16:9',
    '4:5': '4:5',
  };
  const payload = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: input.avatarId,
          avatar_style: input.variantStyle ?? 'formal',
        },
        voice: input.voiceId
          ? { type: 'voice_id', voice_id: input.voiceId }
          : { type: 'avatar_default' },
        input_text: input.script,
      },
    ],
    aspect_ratio: aspectMap[input.aspectRatio ?? '9:16'],
  };
  const data = await heygenFetch<{
    data: { video_id: string; video_url?: string; status?: string; cost?: number };
  }>('/video/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return {
    videoId: data.data.video_id,
    videoUrl: data.data.video_url ?? null,
    costUsd: estimateClipCost(input.script.length),
    status: normalizeClipStatus(data.data.status),
  };
}

export async function listAvatars(): Promise<ListAvatarsResult> {
  ensureFeatureEnabled();
  const data = await heygenFetch<{
    data: { avatars: ReadonlyArray<{ avatar_id: string; avatar_name: string; status: string }> };
  }>('/avatars', { method: 'GET' });
  return {
    avatars: data.data.avatars.map((a) => ({
      id: a.avatar_id,
      name: a.avatar_name,
      status: normalizeStatus(a.status),
    })),
  };
}

export async function deleteAvatar(avatarId: string): Promise<{ deleted: boolean }> {
  ensureFeatureEnabled();
  await heygenFetch<{ ok: boolean }>(`/avatars/${encodeURIComponent(avatarId)}`, {
    method: 'DELETE',
  });
  return { deleted: true };
}

export async function testConnection(): Promise<TestConnectionResult> {
  if (!process.env.HEYGEN_API_KEY) {
    return { ok: false, reason: 'HEYGEN_API_KEY no configurado' };
  }
  try {
    const data = await heygenFetch<{
      data: { remaining_quota?: number; avatars_count?: number };
    }>('/user/remaining_quota', { method: 'GET' }, HEYGEN_BASE_V1);
    return {
      ok: true,
      accountInfo: {
        remainingCredits: data.data.remaining_quota ?? 0,
        avatarsCount: data.data.avatars_count ?? 0,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    return { ok: false, reason: message };
  }
}

function normalizeStatus(status: string | undefined): AvatarStatus {
  if (!status) return 'pending';
  const lower = status.toLowerCase();
  if (lower.includes('ready') || lower === 'completed' || lower === 'success') return 'ready';
  if (lower.includes('process') || lower === 'in_progress') return 'processing';
  if (lower.includes('fail') || lower === 'error') return 'failed';
  return 'pending';
}

function normalizeClipStatus(status: string | undefined): 'pending' | 'completed' | 'failed' {
  if (!status) return 'pending';
  const lower = status.toLowerCase();
  if (lower === 'completed' || lower === 'ready' || lower === 'success') return 'completed';
  if (lower === 'failed' || lower === 'error') return 'failed';
  return 'pending';
}

function estimateClipCost(scriptLen: number): number {
  const seconds = Math.max(5, Math.ceil(scriptLen / 18));
  return Number((seconds * 0.045).toFixed(4));
}
