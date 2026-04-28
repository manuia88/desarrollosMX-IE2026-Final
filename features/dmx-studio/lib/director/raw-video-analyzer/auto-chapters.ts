// F14.F.6 Sprint 5 BIBLIA UPGRADE 5 — Auto-chapters > 2 min.

export interface Chapter {
  title: string;
  startMs: number;
  endMs: number;
}

const MIN_DURATION_FOR_CHAPTERS_MS = 2 * 60 * 1000;
const TARGET_CHAPTERS_MIN = 3;
const TARGET_CHAPTERS_MAX = 7;

export interface ChapterSeed {
  start: number;
  end: number;
  transcript: string;
}

export function shouldGenerateChapters(durationMs: number): boolean {
  return durationMs >= MIN_DURATION_FOR_CHAPTERS_MS;
}

export function generateChaptersFromUtterances(
  utterances: ReadonlyArray<ChapterSeed>,
  durationMs: number,
  generateTitle: (transcript: string, index: number) => string = defaultTitle,
): Chapter[] {
  if (!shouldGenerateChapters(durationMs)) return [];
  if (utterances.length === 0) return [];

  const targetCount = Math.min(
    TARGET_CHAPTERS_MAX,
    Math.max(TARGET_CHAPTERS_MIN, Math.ceil(durationMs / (3 * 60 * 1000))),
  );
  const chunkSize = Math.ceil(utterances.length / targetCount);
  const chapters: Chapter[] = [];

  for (let i = 0; i < utterances.length; i += chunkSize) {
    const chunk = utterances.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    if (!first || !last) continue;
    const transcript = chunk.map((u) => u.transcript).join(' ');
    chapters.push({
      title: generateTitle(transcript, chapters.length),
      startMs: Math.round(first.start * 1000),
      endMs: Math.round(last.end * 1000),
    });
  }

  return chapters;
}

function defaultTitle(transcript: string, index: number): string {
  const trimmed = transcript.trim().split(/[.!?]/)[0]?.trim() ?? '';
  if (trimmed.length === 0) return `Capítulo ${index + 1}`;
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57)}...`;
}
