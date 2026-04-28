// F14.F.6 Sprint 5 BIBLIA CROSS-FUNCTION 9 — M03 timeline raw video integration.
// Cuando raw video se asocia a propiedad/captación: INSERT contact_notes type=sistema.
// Cross-feature import vía pattern existente F14.F.5 (canon Rule #5 — sigue patrón m03-timeline-integration).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface RecordRawVideoTimelineResult {
  readonly inserted: boolean;
  readonly noteId: string | null;
  readonly leadId: string | null;
  readonly skippedReason: string | null;
}

interface RawVideoRow {
  id: string;
  user_id: string;
  project_id: string | null;
  duration_seconds: number | null;
}

export async function recordRawVideoInTimeline(
  supabase: AdminSupabase,
  rawVideoId: string,
): Promise<RecordRawVideoTimelineResult> {
  const { data: video, error: vErr } = await supabase
    .from('studio_raw_videos')
    .select('id, user_id, project_id, duration_seconds')
    .eq('id', rawVideoId)
    .maybeSingle<RawVideoRow>();
  if (vErr || !video) {
    return { inserted: false, noteId: null, leadId: null, skippedReason: 'video_not_found' };
  }

  if (!video.project_id) {
    return { inserted: false, noteId: null, leadId: null, skippedReason: 'no_project_link' };
  }

  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('user_id', video.user_id)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!lead) {
    return {
      inserted: false,
      noteId: null,
      leadId: null,
      skippedReason: 'no_lead_match',
    };
  }

  const durationLabel = video.duration_seconds
    ? `${Math.round(Number(video.duration_seconds) / 60)} min`
    : 'sin duración';
  const noteContent = `Studio: video crudo procesado (${durationLabel}) para esta propiedad.`;

  const { data: note, error: nErr } = await supabase
    .from('contact_notes')
    .insert({
      lead_id: lead.id,
      author_user_id: video.user_id,
      level: 'sistema',
      content_md: noteContent,
    })
    .select('id')
    .single();

  if (nErr) {
    return {
      inserted: false,
      noteId: null,
      leadId: lead.id,
      skippedReason: `insert_failed: ${nErr.message}`,
    };
  }

  return { inserted: true, noteId: note.id, leadId: lead.id, skippedReason: null };
}
