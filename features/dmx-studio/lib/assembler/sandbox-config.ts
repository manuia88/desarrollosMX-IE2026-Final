// FASE 14.F.2 Sprint 1 — Vercel Sandbox FFmpeg config (Hobby plan limits).

export interface SandboxConfig {
  readonly maxDurationSeconds: number;
  readonly maxMemoryMb: number;
  readonly defaultTimeoutSeconds: number;
}

export function getSandboxConfig(): SandboxConfig {
  return {
    maxDurationSeconds: 45 * 60,
    maxMemoryMb: 8 * 1024,
    defaultTimeoutSeconds: 8 * 60,
  };
}
