// F14.F.6 Sprint 5 BIBLIA UPGRADE 1 — Filler patterns ES-MX regional canon.
// Detect: este, o sea, basicamente, tipo, wey, guey + tics interrogativos no?, verdad?

export const FILLERS_MX: ReadonlyArray<string> = [
  'este',
  'eh',
  'ehh',
  'mmm',
  'mhm',
  'uhm',
  'uhh',
  'o sea',
  'osea',
  'basicamente',
  'básicamente',
  'tipo',
  'wey',
  'güey',
  'guey',
  'pues',
  'entonces',
  'digamos',
  'digo',
  'asi como',
  'así como',
];

export const REGIONAL_TICS: ReadonlyArray<string> = [
  'no?',
  'verdad?',
  'sí?',
  'si?',
  'sabes?',
  'ves?',
  'me explico?',
];

export const SILENCE_THRESHOLD_MS = 2000;

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[.,!;]/g, '');
}

export function isFiller(word: string): boolean {
  const norm = normalizeWord(word);
  return FILLERS_MX.includes(norm);
}

export function isRegionalTic(phrase: string): boolean {
  const norm = phrase.toLowerCase().trim();
  return REGIONAL_TICS.some((tic) => norm.endsWith(tic));
}

export interface FillerStats {
  totalCount: number;
  topFillers: Array<{ word: string; count: number }>;
}

export function computeFillerStats(words: ReadonlyArray<{ word: string }>): FillerStats {
  const counts = new Map<string, number>();
  for (const w of words) {
    const norm = normalizeWord(w.word);
    if (FILLERS_MX.includes(norm)) {
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
  }
  const topFillers = Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const totalCount = topFillers.reduce((sum, f) => sum + f.count, 0);
  return { totalCount, topFillers };
}
