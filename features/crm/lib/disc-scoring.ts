import type { TraitSystem } from '@/features/crm/schemas';

const DISC_CODES = ['D', 'I', 'S', 'C'] as const;
const BIG_FIVE_CODES = ['O', 'C', 'E', 'A', 'N'] as const;

export type DiscCode = (typeof DISC_CODES)[number];
export type BigFiveCode = (typeof BIG_FIVE_CODES)[number];

export function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

export function isValidTraitCode(system: TraitSystem, code: string): boolean {
  if (system === 'disc') {
    return (DISC_CODES as ReadonlyArray<string>).includes(code);
  }
  return (BIG_FIVE_CODES as ReadonlyArray<string>).includes(code);
}

export function normalizeDiscProfile(raw: Record<string, number>): Record<DiscCode, number> {
  const out: Record<DiscCode, number> = { D: 0, I: 0, S: 0, C: 0 };
  for (const code of DISC_CODES) {
    const value = raw[code];
    out[code] = typeof value === 'number' ? clampScore(value) : 0;
  }
  return out;
}

export function normalizeBigFiveProfile(raw: Record<string, number>): Record<BigFiveCode, number> {
  const out: Record<BigFiveCode, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (const code of BIG_FIVE_CODES) {
    const value = raw[code];
    out[code] = typeof value === 'number' ? clampScore(value) : 0;
  }
  return out;
}

export function dominantDiscTrait(profile: Record<DiscCode, number>): DiscCode {
  let dominant: DiscCode = 'D';
  let max = -1;
  for (const code of DISC_CODES) {
    if (profile[code] > max) {
      max = profile[code];
      dominant = code;
    }
  }
  return dominant;
}
