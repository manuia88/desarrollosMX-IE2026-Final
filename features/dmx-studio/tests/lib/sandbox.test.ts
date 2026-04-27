import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();

vi.mock('@vercel/sandbox', () => {
  class Sandbox {
    static create = createMock;
  }
  return { Sandbox };
});

const ORIG_OIDC = process.env.VERCEL_OIDC_TOKEN;
const ORIG_VERCEL = process.env.VERCEL_TOKEN;

beforeEach(() => {
  createMock.mockReset();
  process.env.VERCEL_OIDC_TOKEN = 'test-oidc-token';
});

afterEach(() => {
  if (ORIG_OIDC === undefined) delete process.env.VERCEL_OIDC_TOKEN;
  else process.env.VERCEL_OIDC_TOKEN = ORIG_OIDC;
  if (ORIG_VERCEL === undefined) delete process.env.VERCEL_TOKEN;
  else process.env.VERCEL_TOKEN = ORIG_VERCEL;
  vi.restoreAllMocks();
});

describe('testConnection', () => {
  it('returns ok:true when Sandbox class importable and token present (no sandbox created)', async () => {
    const { testConnection } = await import('../../lib/sandbox');
    const result = testConnection();
    expect(result.ok).toBe(true);
    expect(result.sdkAvailable).toBe(true);
    expect(result.tokenPresent).toBe(true);
    expect(result.planTier).toBe('hobby');
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('createFFmpegSandbox', () => {
  it('calls Sandbox.create with canon timeout and vcpus defaults', async () => {
    const fakeSandbox = { sandboxId: 'sbx_test_001' };
    createMock.mockResolvedValue(fakeSandbox);

    const { createFFmpegSandbox, SANDBOX_TIMEOUT_MS_DEFAULT, SANDBOX_VCPUS_DEFAULT } = await import(
      '../../lib/sandbox'
    );

    const result = await createFFmpegSandbox();

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      timeout: SANDBOX_TIMEOUT_MS_DEFAULT,
      resources: { vcpus: SANDBOX_VCPUS_DEFAULT },
    });
    expect(result).toBe(fakeSandbox);
  });
});

describe('smokeTestSandbox', () => {
  it('creates sandbox + runs command + stops, returns ok:true with runtimeMs > 0', async () => {
    const stopMock = vi.fn().mockResolvedValue(undefined);
    const stdoutMock = vi.fn().mockResolvedValue('FFmpeg sandbox OK\n');
    const runCommandMock = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { exitCode: 0, stdout: stdoutMock };
    });
    createMock.mockResolvedValue({
      runCommand: runCommandMock,
      stop: stopMock,
    });

    const { smokeTestSandbox } = await import('../../lib/sandbox');
    const result = await smokeTestSandbox();

    expect(result.ok).toBe(true);
    expect(result.runtimeMs).toBeGreaterThan(0);
    expect(result.output).toBe('FFmpeg sandbox OK');
    expect(runCommandMock).toHaveBeenCalledWith('echo', ['FFmpeg sandbox OK']);
    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(stdoutMock).toHaveBeenCalledTimes(1);
  });
});
