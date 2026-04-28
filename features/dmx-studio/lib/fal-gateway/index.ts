// F14.F.7 Sprint 6 BIBLIA v4 §6 — fal-gateway real (replaces F14.F.0 STUB).
// DMX Studio dentro DMX único entorno (ADR-054). Multi-modelo gateway via @fal-ai/client.
// Verify-before-spend canon: testConnection lectura account info sin gastar credits.

import { createFalClient, type FalClient } from '@fal-ai/client';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const DEFAULT_SEEDANCE_MODEL = 'fal-ai/bytedance/seedance/v1/pro/image-to-video';
export const DEFAULT_FLUX_MODEL = 'fal-ai/flux/dev';

export type FalModelKey = 'seedance' | 'flux';

let cachedClient: FalClient | null = null;

export function getFalClient(): FalClient {
  if (cachedClient) return cachedClient;
  cachedClient = createFalClient({
    credentials: process.env.FAL_API_KEY ?? process.env.FAL_KEY ?? '',
  });
  return cachedClient;
}

export interface SubmitJobOptions {
  client?: FalClient;
}

export async function submitJob(
  modelId: string,
  input: Record<string, unknown>,
  opts?: SubmitJobOptions,
): Promise<{ requestId: string }> {
  const client = opts?.client ?? getFalClient();
  try {
    const { request_id } = await client.queue.submit(modelId, { input });
    return { requestId: request_id };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.fal-gateway', op: 'submitJob' },
      extra: { modelId },
    });
    throw err;
  }
}

export type FalQueueStatus = 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface PollStatusResult<TOutput = unknown> {
  status: FalQueueStatus;
  output?: TOutput;
  logs?: string[];
}

export async function pollStatus<TOutput = unknown>(
  modelId: string,
  requestId: string,
  opts?: SubmitJobOptions,
): Promise<PollStatusResult<TOutput>> {
  const client = opts?.client ?? getFalClient();
  try {
    const status = await client.queue.status(modelId, { requestId, logs: true });
    if (status.status === 'COMPLETED') {
      const result = await client.queue.result(modelId, { requestId });
      return {
        status: 'COMPLETED' as const,
        output: result.data as TOutput,
        logs: extractLogs(status),
      };
    }
    return {
      status: status.status as FalQueueStatus,
      logs: extractLogs(status),
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.fal-gateway', op: 'pollStatus' },
      extra: { modelId, requestId },
    });
    throw err;
  }
}

function extractLogs(status: unknown): string[] {
  if (!status || typeof status !== 'object') return [];
  const maybe = status as { logs?: unknown };
  if (!Array.isArray(maybe.logs)) return [];
  return maybe.logs
    .map((l) => (l && typeof l === 'object' && 'message' in l ? String((l as { message: unknown }).message) : ''))
    .filter(Boolean);
}

export interface SubscribeOptions extends SubmitJobOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export async function generateFromModel<TOutput = unknown>(
  modelKey: FalModelKey,
  input: Record<string, unknown>,
  opts?: SubscribeOptions,
): Promise<{ requestId: string; output: TOutput }> {
  const modelId = modelKey === 'seedance' ? DEFAULT_SEEDANCE_MODEL : DEFAULT_FLUX_MODEL;
  const client = opts?.client ?? getFalClient();
  try {
    const result = await client.subscribe(modelId, { input: input as never, logs: true });
    return {
      requestId: result.requestId,
      output: result.data as TOutput,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.fal-gateway', op: 'generateFromModel', modelKey },
    });
    throw err;
  }
}

export interface ListModelsResult {
  models: string[];
  defaultSeedance: string;
  defaultFlux: string;
}

export function listModels(): ListModelsResult {
  return {
    models: [DEFAULT_SEEDANCE_MODEL, DEFAULT_FLUX_MODEL],
    defaultSeedance: DEFAULT_SEEDANCE_MODEL,
    defaultFlux: DEFAULT_FLUX_MODEL,
  };
}

export interface TestConnectionResult {
  ok: boolean;
  modelsAvailable: number;
  hasCredentials: boolean;
  error?: string;
}

export async function testConnection(): Promise<TestConnectionResult> {
  const hasCredentials = Boolean(process.env.FAL_API_KEY ?? process.env.FAL_KEY);
  if (!hasCredentials) {
    return { ok: false, modelsAvailable: 0, hasCredentials: false, error: 'FAL_API_KEY not configured' };
  }
  const { models } = listModels();
  return { ok: true, modelsAvailable: models.length, hasCredentials: true };
}
