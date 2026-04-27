import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/telemetry/sentry', () => ({
  sentry: { captureException: vi.fn() },
}));

vi.mock('../../lib/kling', () => ({
  testConnection: vi.fn(async () => ({ ok: true, modelsAvailable: 42 })),
}));

vi.mock('../../lib/elevenlabs', () => ({
  testConnection: vi.fn(async () => ({
    ok: true,
    subscriptionTier: 'pay_as_you_go',
    characterBalance: 9000,
    voiceCloneAvailable: false,
  })),
}));

vi.mock('../../lib/claude-director', () => ({
  testConnection: vi.fn(async () => ({ ok: true, accountActive: true })),
}));

vi.mock('../../lib/vision', () => ({
  testConnection: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../../lib/sandbox', () => ({
  testConnection: vi.fn(() => ({
    ok: true,
    sdkAvailable: true,
    tokenPresent: true,
    planTier: 'hobby',
  })),
}));

vi.mock('../../lib/fal-gateway', () => ({
  testConnection: vi.fn(async () => ({ ok: false, reason: 'STUB H2 Sprint 6 fal-gateway' })),
}));

vi.mock('../../lib/heygen', () => ({
  testConnection: vi.fn(async () => ({ ok: false, reason: 'STUB H2 Sprint 7 HeyGen avatar' })),
}));

vi.mock('../../lib/virtual-staging', () => ({
  testConnection: vi.fn(async () => ({ ok: false, reason: 'STUB H2 Sprint 6 Virtual Staging' })),
}));

vi.mock('../../lib/flux', () => ({
  testConnection: vi.fn(async () => ({ ok: false, reason: 'STUB H2 Sprint 6 Flux frame+upscale' })),
}));

vi.mock('../../lib/deepgram', () => ({
  testConnection: vi.fn(async () => ({
    ok: false,
    reason: 'STUB H2 Sprint 5 Deepgram transcription',
  })),
}));

vi.mock('../../lib/seedance', () => ({
  testConnection: vi.fn(async () => ({
    ok: false,
    reason: 'STUB H2 Sprint 6 Seedance via fal.ai',
  })),
}));

const ENV_KEYS = [
  'REPLICATE_API_TOKEN',
  'ELEVENLABS_API_KEY',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BANXICO_TOKEN',
] as const;

const ORIG_ENV: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    ORIG_ENV[key] = process.env[key];
    process.env[key] = `test-${key.toLowerCase()}`;
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (ORIG_ENV[key] === undefined) delete process.env[key];
    else process.env[key] = ORIG_ENV[key];
  }
});

describe('runStudioHealthCheck', () => {
  it('returns overallOk:true when all real wrappers ok and zero missing env keys', async () => {
    const { runStudioHealthCheck } = await import('../../lib/health-check');
    const report = await runStudioHealthCheck();
    expect(report.overallOk).toBe(true);
    expect(report.realWrappersOk).toBe(5);
    expect(report.realWrappersTotal).toBe(5);
    expect(report.missingEnvKeys).toEqual([]);
  });

  it('counts 6 stub wrappers correctly', async () => {
    const { runStudioHealthCheck } = await import('../../lib/health-check');
    const report = await runStudioHealthCheck();
    expect(report.stubWrappersCount).toBe(6);
    expect(report.perWrapper.fal_gateway.isStub).toBe(true);
    expect(report.perWrapper.heygen.isStub).toBe(true);
    expect(report.perWrapper.kling.isStub).toBe(false);
  });

  it('flags missing env keys', async () => {
    delete process.env.REPLICATE_API_TOKEN;
    delete process.env.STRIPE_SECRET_KEY;
    const { runStudioHealthCheck } = await import('../../lib/health-check');
    const report = await runStudioHealthCheck();
    expect(report.overallOk).toBe(false);
    expect(report.missingEnvKeys).toContain('REPLICATE_API_TOKEN');
    expect(report.missingEnvKeys).toContain('STRIPE_SECRET_KEY');
  });

  it('reports feature flags disabled count default canon', async () => {
    const { runStudioHealthCheck } = await import('../../lib/health-check');
    const report = await runStudioHealthCheck();
    expect(report.featureFlagsDisabledCount).toBeGreaterThanOrEqual(7);
  });
});
