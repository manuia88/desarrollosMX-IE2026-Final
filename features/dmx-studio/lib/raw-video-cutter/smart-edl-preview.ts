// F14.F.6 Sprint 5 BIBLIA UPGRADE 3 — Smart EDL preview.
// Para cada cut: 3-5 sec preview clip antes/después → asesor aprueba/rechaza.

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface CutPreview {
  index: number;
  startMs: number;
  endMs: number;
  reason: string;
  preview?: string | null;
  beforeMs: number;
  afterMs: number;
}

export interface EdlPreviewResult {
  cuts: CutPreview[];
}

const PREVIEW_BEFORE_MS = 1500;
const PREVIEW_AFTER_MS = 1500;

interface EdlCut {
  startMs: number;
  endMs: number;
  reason: string;
  preview?: string;
}

export async function getEdlPreview(rawVideoId: string): Promise<EdlPreviewResult> {
  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from('studio_raw_videos')
    .select('id, edl, duration_seconds')
    .eq('id', rawVideoId)
    .maybeSingle();
  if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  if (!video) throw new TRPCError({ code: 'NOT_FOUND' });

  const cuts = (Array.isArray(video.edl) ? video.edl : []) as unknown as EdlCut[];
  const durationMs = Math.round((video.duration_seconds ?? 0) * 1000);

  const preview: CutPreview[] = cuts.map((cut, index) => ({
    index,
    startMs: cut.startMs,
    endMs: cut.endMs,
    reason: cut.reason,
    preview: cut.preview ?? null,
    beforeMs: Math.max(0, cut.startMs - PREVIEW_BEFORE_MS),
    afterMs: Math.min(durationMs, cut.endMs + PREVIEW_AFTER_MS),
  }));

  return { cuts: preview };
}
