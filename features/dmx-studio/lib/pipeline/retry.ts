// FASE 14.F.2 Sprint 1 — Pipeline retry helper (Tarea 1.5 BIBLIA).
// Exponential backoff retry envuelve llamadas Kling/ElevenLabs en pipeline orchestrator.
// Defaults canon: maxAttempts=3, baseDelayMs=1000, exponential 2^attempt (1s, 2s, 4s).

export interface RetryOptions {
  readonly maxAttempts?: number;
  readonly baseDelayMs?: number;
  readonly onAttemptError?: (err: unknown, attempt: number) => void;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('retryWithBackoff: maxAttempts must be a positive integer');
  }
  if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
    throw new Error('retryWithBackoff: baseDelayMs must be a non-negative number');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      opts.onAttemptError?.(err, attempt + 1);
      const isLast = attempt === maxAttempts - 1;
      if (isLast) break;
      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`retryWithBackoff: exhausted ${maxAttempts} attempts`);
}
