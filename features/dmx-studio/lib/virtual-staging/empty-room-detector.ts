// F14.F.7 Sprint 6 BIBLIA v4 §6 UPGRADE 7 — Empty room heuristic detector.
// DMX Studio dentro DMX único entorno (ADR-054). Pure heuristic over already-classified assets.
// NO supabase calls. NO Anthropic Vision calls. Just keyword match over tags.

import { z } from 'zod';

const EMPTY_KEYWORDS = ['vacio', 'empty', 'unfurnished', 'sin_muebles'] as const;

export const EmptyRoomCandidateSchema = z.object({
  id: z.string(),
  storage_url: z.string().url(),
  ai_classification: z.unknown().optional(),
  meta: z.unknown().optional(),
});

export type EmptyRoomCandidate = z.infer<typeof EmptyRoomCandidateSchema>;

function extractTags(source: unknown): string[] {
  if (source == null || typeof source !== 'object') return [];
  const record = source as Record<string, unknown>;
  const raw = record.tags;
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is string => typeof t === 'string').map((t) => t.toLowerCase());
}

export function detectEmptyByMeta(asset: {
  ai_classification?: unknown;
  meta?: unknown;
}): boolean {
  const tags = [...extractTags(asset.ai_classification), ...extractTags(asset.meta)];
  if (tags.length === 0) return false;
  return tags.some((tag) => EMPTY_KEYWORDS.some((kw) => tag.includes(kw)));
}
