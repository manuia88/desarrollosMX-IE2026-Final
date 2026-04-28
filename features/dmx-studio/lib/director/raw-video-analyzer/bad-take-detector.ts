// F14.F.6 Sprint 5 BIBLIA UPGRADE 2 — Bad take detector.
// Sliding window 5 words: phrase repeats ≥70% similarity in next 10s = bad take.

export interface DetectorWord {
  word: string;
  start: number;
  end: number;
}

export interface BadTake {
  startMs: number;
  endMs: number;
  reason: 'repetition' | 'false_start';
  preview: string;
}

const WINDOW_SIZE = 5;
const REPETITION_LOOKAHEAD_SECONDS = 10;
const SIMILARITY_THRESHOLD = 0.7;

export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((w) => w.toLowerCase()));
  const setB = new Set(b.map((w) => w.toLowerCase()));
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function detectBadTakes(words: ReadonlyArray<DetectorWord>): BadTake[] {
  if (words.length < WINDOW_SIZE * 2) return [];
  const badTakes: BadTake[] = [];

  for (let i = 0; i <= words.length - WINDOW_SIZE; i++) {
    const windowA = words.slice(i, i + WINDOW_SIZE);
    const wordsA = windowA.map((w) => w.word);
    const aEnd = windowA[WINDOW_SIZE - 1]?.end ?? 0;
    const aStart = windowA[0]?.start ?? 0;

    for (let j = i + WINDOW_SIZE; j <= words.length - WINDOW_SIZE; j++) {
      const windowB = words.slice(j, j + WINDOW_SIZE);
      const bStart = windowB[0]?.start ?? 0;
      if (bStart - aEnd > REPETITION_LOOKAHEAD_SECONDS) break;

      const wordsB = windowB.map((w) => w.word);
      const sim = jaccardSimilarity(wordsA, wordsB);
      if (sim >= SIMILARITY_THRESHOLD) {
        badTakes.push({
          startMs: Math.round(aStart * 1000),
          endMs: Math.round(aEnd * 1000),
          reason: 'repetition',
          preview: wordsA.join(' '),
        });
        break;
      }
    }
  }

  return dedupeBadTakes(badTakes);
}

function dedupeBadTakes(takes: BadTake[]): BadTake[] {
  if (takes.length === 0) return takes;
  const sorted = [...takes].sort((a, b) => a.startMs - b.startMs);
  const result: BadTake[] = [sorted[0] as BadTake];
  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1] as BadTake;
    const curr = sorted[i] as BadTake;
    if (curr.startMs >= prev.endMs) {
      result.push(curr);
    }
  }
  return result;
}
