import { createHash } from 'node:crypto';

// Determinismo: hash(naturalKey) % 100 < percentage
// Misma row siempre cae en el mismo bucket → samples reproducibles.
// Upgrade #3 §5.A FASE 07.
export function applySample<T>(rows: T[], percentage: number, naturalKey: (row: T) => string): T[] {
  if (percentage >= 100) return rows;
  if (percentage <= 0) return [];
  const out: T[] = [];
  for (const row of rows) {
    const key = naturalKey(row);
    if (hashBucket(key) < percentage) out.push(row);
  }
  return out;
}

function hashBucket(key: string): number {
  const h = createHash('sha1').update(key).digest();
  // Bytes 0..3 → uint32 → mod 100. SHA-1 distribuye ~uniformemente.
  const v = h.readUInt32BE(0);
  return v % 100;
}

export function getDefaultSamplePercentage(): number {
  const env = process.env.SAMPLE_PERCENTAGE;
  if (!env) return process.env.NODE_ENV === 'production' ? 100 : 1;
  const n = Number.parseInt(env, 10);
  if (!Number.isFinite(n) || n < 1 || n > 100) {
    return process.env.NODE_ENV === 'production' ? 100 : 1;
  }
  return n;
}
