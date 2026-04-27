// DMX Studio Vercel Sandbox wrapper canon (BIBLIA v4 + ADR-054 lock canon).
// DMX Studio dentro DMX único entorno: FFmpeg execution sandboxed via Vercel
// Firecracker microVMs. Auth automático via OIDC token cuando se ejecuta dentro
// Vercel runtime; en local development requiere VERCEL_TOKEN.
//
// Vercel Sandbox Hobby plan limits: 5h compute total/mes, 45min duration max
// per sandbox, 2 vCPUs / 8GB memory max (2GB por vCPU). Suficiente F14.F MVP H1
// (FFmpeg compose ~30s/video x ~50 videos/mes/user x 5 users piloto ≈ 2.1h/mes
// — 42% Hobby quota). Upgrade Pro plan cuando >50 videos/mes total.
//
// Verify-before-spend canon (memoria 7): testConnection() NO crea ni ejecuta
// sandbox real. Solo smokeTestSandbox() crea sandbox real (operación manual).

import { Sandbox } from '@vercel/sandbox';
import { z } from 'zod';
import { sentry } from '@/shared/lib/telemetry/sentry';

export const SANDBOX_REGION_DEFAULT = process.env.VERCEL_SANDBOX_REGION ?? 'iad1';
export const SANDBOX_TIMEOUT_MS_DEFAULT = 30 * 60 * 1000;
export const SANDBOX_VCPUS_DEFAULT = 2;
export const SANDBOX_MEMORY_MB_DEFAULT = 8192;

export const CreateSandboxOptionsSchema = z.object({
  region: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  vcpus: z.number().int().min(1).max(2).optional(),
});

export type CreateSandboxOptions = z.infer<typeof CreateSandboxOptionsSchema>;

export type StudioSandboxPlanTier = 'hobby' | 'pro' | 'enterprise';

export interface TestConnectionResult {
  ok: boolean;
  sdkAvailable: boolean;
  tokenPresent: boolean;
  planTier?: StudioSandboxPlanTier;
  error?: string;
}

export interface SmokeTestResult {
  ok: boolean;
  runtimeMs: number;
  output?: string;
  error?: string;
}

/**
 * Create a Vercel Sandbox configured for FFmpeg execution.
 *
 * Applies DMX Studio canon defaults (timeout 30min, 2 vCPUs Hobby cap).
 * Region is server-managed by Vercel (no client-side override exposed in SDK).
 */
export async function createFFmpegSandbox(options?: CreateSandboxOptions): Promise<Sandbox> {
  const parsed = CreateSandboxOptionsSchema.parse(options ?? {});
  const timeout = parsed.timeoutMs ?? SANDBOX_TIMEOUT_MS_DEFAULT;
  const vcpus = parsed.vcpus ?? SANDBOX_VCPUS_DEFAULT;

  try {
    const sandbox = await Sandbox.create({
      timeout,
      resources: { vcpus },
    });
    return sandbox;
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'dmx-studio', component: 'sandbox', op: 'create' },
      extra: { timeout, vcpus },
    });
    throw err;
  }
}

/**
 * Smoke test: creates a real sandbox, runs a no-op echo command, then stops it.
 *
 * WARNING: this consumes Hobby plan compute quota. Only invoke manually
 * (founder/PM op). NOT to be called from automated CI or testConnection paths.
 */
export async function smokeTestSandbox(): Promise<SmokeTestResult> {
  const startedAt = Date.now();
  let sandbox: Sandbox | null = null;
  try {
    sandbox = await createFFmpegSandbox();
    const finished = await sandbox.runCommand('echo', ['FFmpeg sandbox OK']);
    const stdout = await finished.stdout();
    await sandbox.stop();
    return {
      ok: finished.exitCode === 0,
      runtimeMs: Date.now() - startedAt,
      output: stdout.trim(),
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { module: 'dmx-studio', component: 'sandbox', op: 'smoke' },
    });
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch (stopErr) {
        sentry.captureException(stopErr, {
          tags: { module: 'dmx-studio', component: 'sandbox', op: 'smoke-stop' },
        });
      }
    }
    return {
      ok: false,
      runtimeMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Verify SDK + auth presence WITHOUT creating a sandbox (verify-before-spend
 * canon). Returns ok:true when Sandbox class is importable AND credentials
 * (OIDC token in Vercel runtime, or VERCEL_TOKEN locally) are present.
 */
export function testConnection(): TestConnectionResult {
  const sdkAvailable = typeof Sandbox === 'function';
  const tokenPresent = Boolean(process.env.VERCEL_OIDC_TOKEN ?? process.env.VERCEL_TOKEN);

  if (!sdkAvailable) {
    return {
      ok: false,
      sdkAvailable,
      tokenPresent,
      planTier: 'hobby',
      error: 'sandbox_sdk_unavailable',
    };
  }

  if (!tokenPresent) {
    return {
      ok: false,
      sdkAvailable,
      tokenPresent,
      planTier: 'hobby',
      error: 'sandbox_token_missing',
    };
  }

  return {
    ok: true,
    sdkAvailable,
    tokenPresent,
    planTier: 'hobby',
  };
}
