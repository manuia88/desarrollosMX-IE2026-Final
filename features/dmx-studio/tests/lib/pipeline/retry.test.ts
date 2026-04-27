// FASE 14.F.2 Sprint 1 — retry.ts unit tests (Tarea 1.5 BIBLIA).

import { describe, expect, it, vi } from 'vitest';
import { retryWithBackoff } from '@/features/dmx-studio/lib/pipeline/retry';

describe('retryWithBackoff', () => {
  it('returns value on first attempt without delay', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries until success after 2 failures', async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) throw new Error(`transient_${calls}`);
      return 'success';
    });
    const result = await retryWithBackoff(fn, { maxAttempts: 5, baseDelayMs: 0 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxAttempts exhausted preserving last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent_failure'));
    await expect(retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 0 })).rejects.toThrow(
      'persistent_failure',
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('invokes onAttemptError callback per failure', async () => {
    const onError = vi.fn();
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(
      retryWithBackoff(fn, { maxAttempts: 2, baseDelayMs: 0, onAttemptError: onError }),
    ).rejects.toThrow();
    expect(onError).toHaveBeenCalledTimes(2);
  });
});
