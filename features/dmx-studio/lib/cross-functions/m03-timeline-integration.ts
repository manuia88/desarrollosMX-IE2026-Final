// F14.F.5 Sprint 4 UPGRADE 10 CROSS-FN — M03 Contactos timeline integration.
// Owned por sub-agent 5. Cuando un remarketing video se genera, registra una
// nota tipo 'sistema' en contact_notes (tabla M03 leads/notes) con texto
// pre-formateado para que el asesor vea actividad Studio en el timeline contacto.
//
// STUB ADR-018 — match heurístico: el contacto ID se determina via
// remarketing_job → source_project → captacion_id (si existe) → leads asociados.
// L-NEW-M03-CROSS-FN-CONTACT-MATCH-HEURISTIC-IMPROVE: H2 mejora cuando llegue
// telemetry: hoy si no existe match → skip silencioso (returning skipped=true).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface RecordRemarketingTimelineResult {
  readonly inserted: boolean;
  readonly noteId: string | null;
  readonly leadId: string | null;
  readonly skippedReason: string | null;
}

interface RemarketingJobRow {
  id: string;
  angle: string;
  user_id: string;
  source_project_id: string;
  new_project_id: string | null;
}

interface ProjectRow {
  id: string;
  title: string;
  captacion_id: string | null;
  proyecto_id: string | null;
}

function buildNoteBody(
  angle: string,
  propertyTitle: string,
  newProjectId: string | null,
  studioBaseUrl: string,
): string {
  const link = newProjectId
    ? `${studioBaseUrl}/studio-app/projects/${newProjectId}`
    : `${studioBaseUrl}/studio-app/library`;
  return [
    `Studio generó un nuevo remarketing video (ángulo: ${angle}) para ${propertyTitle}.`,
    `Ver: ${link}`,
  ].join('\n');
}

export interface RecordRemarketingTimelineOpts {
  readonly studioBaseUrl?: string;
}

export async function recordRemarketingInTimeline(
  supabase: AdminSupabase,
  remarketingJobId: string,
  contactoId: string | null = null,
  opts: RecordRemarketingTimelineOpts = {},
): Promise<RecordRemarketingTimelineResult> {
  const baseUrl = opts.studioBaseUrl ?? 'https://app.dmx.com';

  const jobResp = await supabase
    .from('studio_remarketing_jobs')
    .select('id, angle, user_id, source_project_id, new_project_id')
    .eq('id', remarketingJobId)
    .maybeSingle();
  if (jobResp.error) {
    throw new Error(`recordRemarketingInTimeline job fetch failed: ${jobResp.error.message}`);
  }
  if (!jobResp.data) {
    return {
      inserted: false,
      noteId: null,
      leadId: null,
      skippedReason: 'remarketing_job_not_found',
    };
  }
  const job = jobResp.data as RemarketingJobRow;

  const projectResp = await supabase
    .from('studio_video_projects')
    .select('id, title, captacion_id, proyecto_id')
    .eq('id', job.source_project_id)
    .maybeSingle();
  if (projectResp.error) {
    throw new Error(
      `recordRemarketingInTimeline project fetch failed: ${projectResp.error.message}`,
    );
  }
  if (!projectResp.data) {
    return {
      inserted: false,
      noteId: null,
      leadId: null,
      skippedReason: 'source_project_not_found',
    };
  }
  const project = projectResp.data as ProjectRow;

  // Heurística match contacto → lead. Preferencia explícita > captacion.lead_id.
  // Si llamador pasó contactoId explícito, lo usamos como leadId directo (M03 contactos = leads).
  // Si no, vamos via project.captacion_id → captaciones.lead_id (FK inversa).
  let leadId: string | null = contactoId;
  if (!leadId && project.captacion_id) {
    const captacionResp = await supabase
      .from('captaciones')
      .select('lead_id')
      .eq('id', project.captacion_id)
      .maybeSingle();
    if (!captacionResp.error && captacionResp.data?.lead_id) {
      leadId = captacionResp.data.lead_id as string;
    }
  }
  if (!leadId) {
    return {
      inserted: false,
      noteId: null,
      leadId: null,
      skippedReason: 'lead_match_not_determinable',
    };
  }

  const body = buildNoteBody(job.angle, project.title, job.new_project_id, baseUrl);
  const insertResp = await supabase
    .from('contact_notes')
    .insert({
      lead_id: leadId,
      author_user_id: job.user_id,
      content_md: body,
      level: 'sistema',
    } as never)
    .select('id')
    .single();
  if (insertResp.error || !insertResp.data) {
    throw new Error(
      `recordRemarketingInTimeline contact_notes insert failed: ${insertResp.error?.message ?? 'no data'}`,
    );
  }

  return {
    inserted: true,
    noteId: insertResp.data.id as string,
    leadId,
    skippedReason: null,
  };
}
