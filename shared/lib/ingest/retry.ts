export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  capMs?: number;
  jitter?: number;
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  onRetry?: (err: unknown, attempt: number, nextWaitMs: number) => void;
}

const DEFAULTS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  retries: 5,
  baseMs: 1000,
  capMs: 60_000,
  jitter: 0.3,
};

export function exponentialBackoff(attempt: number, opts: RetryOptions = {}): number {
  const { baseMs, capMs, jitter } = { ...DEFAULTS, ...opts };
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  const j = exp * jitter * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exp + j));
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries, shouldRetry, onRetry } = { ...DEFAULTS, ...options };
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt === retries;
      const can = shouldRetry ? shouldRetry(err, attempt) : true;
      if (isLast || !can) break;
      const wait = exponentialBackoff(attempt, options);
      onRetry?.(err, attempt, wait);
      await sleep(wait);
    }
  }
  throw lastErr;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
