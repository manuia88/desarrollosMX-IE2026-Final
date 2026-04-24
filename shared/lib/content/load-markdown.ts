import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { defaultLocale, isLocale, type Locale } from '@/shared/lib/i18n/config';

const CONTENT_ROOT = join(process.cwd(), 'content');

export interface LoadMarkdownInput {
  readonly section: 'legal' | 'faq';
  readonly slug: string;
  readonly locale: string;
}

export async function loadLocalizedMarkdown({
  section,
  slug,
  locale,
}: LoadMarkdownInput): Promise<string | null> {
  const resolved: Locale = isLocale(locale) ? locale : defaultLocale;
  const tryRead = async (lc: Locale): Promise<string | null> => {
    const file = join(CONTENT_ROOT, section, `${slug}.${lc}.md`);
    try {
      return await readFile(file, 'utf-8');
    } catch {
      return null;
    }
  };

  const primary = await tryRead(resolved);
  if (primary !== null) return primary;

  if (resolved !== defaultLocale) {
    return tryRead(defaultLocale);
  }
  return null;
}

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export function parseFaqEntries(markdown: string): readonly FaqEntry[] {
  const lines = markdown.split(/\r?\n/);
  const entries: FaqEntry[] = [];
  let currentQuestion: string | null = null;
  let currentAnswer: string[] = [];

  const flush = () => {
    if (currentQuestion !== null) {
      const answer = currentAnswer.join('\n').trim();
      if (answer.length > 0) {
        entries.push({ question: currentQuestion, answer });
      }
    }
    currentQuestion = null;
    currentAnswer = [];
  };

  for (const raw of lines) {
    const h2Match = /^##\s+(.+?)\s*$/.exec(raw);
    if (h2Match) {
      flush();
      currentQuestion = h2Match[1] ?? null;
      continue;
    }
    if (currentQuestion !== null) {
      currentAnswer.push(raw);
    }
  }
  flush();
  return entries;
}
