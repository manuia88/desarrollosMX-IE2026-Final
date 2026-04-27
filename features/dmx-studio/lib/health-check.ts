// FASE 14.F.0 — DMX Studio dentro DMX único entorno (ADR-054).
// Aggregated health check across 9 AI wrappers + Sandbox.
// Verify-before-spend canon: ningún testConnection consume credits.

import { sentry } from '@/shared/lib/telemetry/sentry';
import * as claudeDirector from './claude-director';
import * as deepgram from './deepgram';
import * as elevenlabs from './elevenlabs';
import * as falGateway from './fal-gateway';
import { FEATURE_FLAGS } from './feature-flags';
import * as flux from './flux';
import * as heygen from './heygen';
import * as kling from './kling';
import * as sandbox from './sandbox';
import * as seedance from './seedance';
import * as virtualStaging from './virtual-staging';
import * as vision from './vision';

export type WrapperKey =
  | 'kling'
  | 'elevenlabs'
  | 'claude_director'
  | 'vision'
  | 'sandbox'
  | 'fal_gateway'
  | 'heygen'
  | 'virtual_staging'
  | 'flux'
  | 'deepgram'
  | 'seedance';

export interface WrapperStatus {
  ok: boolean;
  isStub: boolean;
  reason?: string;
  detail?: Record<string, unknown>;
  errorMessage?: string;
}

export interface StudioHealthReport {
  overallOk: boolean;
  realWrappersOk: number;
  realWrappersTotal: number;
  stubWrappersCount: number;
  perWrapper: Record<WrapperKey, WrapperStatus>;
  missingEnvKeys: string[];
  featureFlagsDisabledCount: number;
  checkedAt: string;
}

const REQUIRED_ENV_KEYS = [
  'REPLICATE_API_TOKEN',
  'ELEVENLABS_API_KEY',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BANXICO_TOKEN',
] as const;

async function safeCall<T>(
  fn: () => Promise<T> | T,
  wrapperKey: WrapperKey,
): Promise<{ ok: true; value: T } | { ok: false; errorMessage: string }> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (err) {
    sentry.captureException(err, { tags: { feature: 'studio-health-check', wrapper: wrapperKey } });
    return { ok: false, errorMessage: err instanceof Error ? err.message : String(err) };
  }
}

export async function runStudioHealthCheck(): Promise<StudioHealthReport> {
  const checkedAt = new Date().toISOString();

  const missingEnvKeys = REQUIRED_ENV_KEYS.filter((key) => {
    const value = process.env[key];
    return !value || value.length === 0;
  });

  const featureFlagsDisabledCount = Object.values(FEATURE_FLAGS).filter((v) => v === false).length;

  const [klingResult, elevenResult, directorResult, visionResult] = await Promise.all([
    safeCall(() => kling.testConnection(), 'kling'),
    safeCall(() => elevenlabs.testConnection(), 'elevenlabs'),
    safeCall(() => claudeDirector.testConnection(), 'claude_director'),
    safeCall(() => vision.testConnection(), 'vision'),
  ]);

  const sandboxResult = safeCall(() => sandbox.testConnection(), 'sandbox');
  const falResult = safeCall(() => falGateway.testConnection(), 'fal_gateway');
  const heygenResult = safeCall(() => heygen.testConnection(), 'heygen');
  const stagingResult = safeCall(() => virtualStaging.testConnection(), 'virtual_staging');
  const fluxResult = safeCall(() => flux.testConnection(), 'flux');
  const deepgramResult = safeCall(() => deepgram.testConnection(), 'deepgram');
  const seedanceResult = safeCall(() => seedance.testConnection(), 'seedance');

  const [sandboxR, falR, heygenR, stagingR, fluxR, deepgramR, seedanceR] = await Promise.all([
    sandboxResult,
    falResult,
    heygenResult,
    stagingResult,
    fluxResult,
    deepgramResult,
    seedanceResult,
  ]);

  const perWrapper: Record<WrapperKey, WrapperStatus> = {
    kling: toStatus(klingResult, false),
    elevenlabs: toStatus(elevenResult, false),
    claude_director: toStatus(directorResult, false),
    vision: toStatus(visionResult, false),
    sandbox: toStatus(sandboxR, false),
    fal_gateway: toStatus(falR, true),
    heygen: toStatus(heygenR, true),
    virtual_staging: toStatus(stagingR, true),
    flux: toStatus(fluxR, true),
    deepgram: toStatus(deepgramR, true),
    seedance: toStatus(seedanceR, true),
  };

  const realKeys: WrapperKey[] = ['kling', 'elevenlabs', 'claude_director', 'vision', 'sandbox'];
  const realWrappersTotal = realKeys.length;
  const realWrappersOk = realKeys.filter((k) => perWrapper[k].ok).length;
  const stubWrappersCount = (Object.keys(perWrapper) as WrapperKey[]).filter(
    (k) => perWrapper[k].isStub,
  ).length;
  const overallOk = realWrappersOk === realWrappersTotal && missingEnvKeys.length === 0;

  return {
    overallOk,
    realWrappersOk,
    realWrappersTotal,
    stubWrappersCount,
    perWrapper,
    missingEnvKeys,
    featureFlagsDisabledCount,
    checkedAt,
  };
}

function toStatus(
  result: { ok: true; value: unknown } | { ok: false; errorMessage: string },
  isStub: boolean,
): WrapperStatus {
  if (result.ok) {
    const value = result.value as Record<string, unknown> | undefined;
    const innerOk = typeof value?.ok === 'boolean' ? (value.ok as boolean) : true;
    const status: WrapperStatus = {
      ok: isStub ? false : innerOk,
      isStub,
    };
    if (value !== undefined) status.detail = value;
    if (typeof value?.reason === 'string') status.reason = value.reason as string;
    return status;
  }
  return {
    ok: false,
    isStub,
    errorMessage: result.errorMessage,
  };
}
