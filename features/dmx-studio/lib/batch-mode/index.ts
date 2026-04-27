// F14.F.5 Sprint 4 — DMX Studio Batch Mode A/B 3 estilos (Agency only).
// Clones a base studio_video_project per requested style with style overrides
// stored in meta jsonb. Plan gating: agency only — non-agency throws FORBIDDEN.
//
// STUB ADR-018 — activar L-NEW-BATCH-MODE-PIPELINE-REAL: H1 marca cada child
// como status='draft' + meta.batch_pending=true sin disparar pipeline real.
// Activar trigger pipeline (kickoffVideoPipeline) cuando founder OK consumo
// real créditos (regla: zero gasto sin validación previa, memoria 8).

import type { SupabaseClient } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import type { Database, Json } from '@/shared/types/database';
import { BATCH_STYLE_KEYS, type BatchStyleKey, STYLE_OVERRIDES } from './style-overrides';
import type { BatchModeResult } from './types';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'] as const;

type StudioAdminClient = SupabaseClient<Database>;

interface BaseProjectRow {
  readonly id: string;
  readonly user_id: string;
  readonly title: string;
  readonly project_type: string;
  readonly source_metadata: Json;
  readonly style_template_id: string | null;
  readonly voice_clone_id: string | null;
  readonly proyecto_id: string | null;
  readonly unidad_id: string | null;
  readonly captacion_id: string | null;
  readonly organization_id: string | null;
  readonly meta: Json;
}

async function assertAgencyPlan(supabase: StudioAdminClient, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('studio_subscriptions')
    .select('plan_key, status')
    .eq('user_id', userId)
    .in('status', [...ACTIVE_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  if (!data || data.plan_key !== 'agency') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'batch_mode_requires_agency_plan',
    });
  }
}

async function fetchBaseProject(
  supabase: StudioAdminClient,
  projectId: string,
  userId: string,
): Promise<BaseProjectRow> {
  const { data, error } = await supabase
    .from('studio_video_projects')
    .select(
      'id, user_id, title, project_type, source_metadata, style_template_id, voice_clone_id, proyecto_id, unidad_id, captacion_id, organization_id, meta',
    )
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }
  if (!data) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'project_not_found' });
  }
  return data as BaseProjectRow;
}

async function resolveStyleTemplateId(
  supabase: StudioAdminClient,
  templateKey: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('studio_style_templates')
    .select('id')
    .eq('key', templateKey)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

function buildChildTitle(baseTitle: string, styleKey: BatchStyleKey): string {
  const labels: Readonly<Record<BatchStyleKey, string>> = {
    lujo: 'Lujo',
    familiar: 'Familiar',
    inversionista: 'Inversionista',
  };
  return `${baseTitle} — ${labels[styleKey]}`;
}

export async function createBatchAB(
  supabase: StudioAdminClient,
  projectId: string,
  userId: string,
  styles?: ReadonlyArray<BatchStyleKey>,
): Promise<BatchModeResult> {
  await assertAgencyPlan(supabase, userId);

  const requestedStyles: ReadonlyArray<BatchStyleKey> =
    styles && styles.length > 0 ? styles : [...BATCH_STYLE_KEYS];

  const baseProject = await fetchBaseProject(supabase, projectId, userId);

  const batchProjectIds: string[] = [];

  for (const styleKey of requestedStyles) {
    const override = STYLE_OVERRIDES[styleKey];
    const styleTemplateId = await resolveStyleTemplateId(supabase, override.styleTemplateKey);

    const baseSourceMeta =
      typeof baseProject.source_metadata === 'object' &&
      baseProject.source_metadata !== null &&
      !Array.isArray(baseProject.source_metadata)
        ? (baseProject.source_metadata as Record<string, Json>)
        : {};

    const childSourceMetadata: Record<string, Json> = {
      ...baseSourceMeta,
      style_template_key: override.styleTemplateKey,
    };

    const childMeta: Record<string, Json> = {
      batch_pending: true,
      batch_variant: styleKey,
      parent_project_id: baseProject.id,
      style_overrides: {
        camera: override.camera,
        color_grade: override.colorGrade,
        music_mood: override.musicMood,
        narration_tone: override.narrationTone,
      },
    };

    const { data: insertData, error: insertErr } = await supabase
      .from('studio_video_projects')
      .insert({
        user_id: userId,
        organization_id: baseProject.organization_id,
        title: buildChildTitle(baseProject.title, styleKey),
        project_type: baseProject.project_type,
        status: 'draft',
        style_template_id: styleTemplateId,
        voice_clone_id: baseProject.voice_clone_id,
        proyecto_id: baseProject.proyecto_id,
        unidad_id: baseProject.unidad_id,
        captacion_id: baseProject.captacion_id,
        source_metadata: childSourceMetadata,
        meta: childMeta,
      })
      .select('id')
      .single();

    if (insertErr || !insertData) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: insertErr?.message ?? 'batch_clone_failed',
        cause: insertErr ?? undefined,
      });
    }

    batchProjectIds.push(insertData.id);
  }

  const parentMeta =
    typeof baseProject.meta === 'object' &&
    baseProject.meta !== null &&
    !Array.isArray(baseProject.meta)
      ? (baseProject.meta as Record<string, Json>)
      : {};

  const updatedParentMeta: Record<string, Json> = {
    ...parentMeta,
    batch_root: true,
    batch_children: batchProjectIds,
    batch_styles: [...requestedStyles],
  };

  const { error: parentUpdateErr } = await supabase
    .from('studio_video_projects')
    .update({ meta: updatedParentMeta })
    .eq('id', baseProject.id);

  if (parentUpdateErr) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: parentUpdateErr.message,
      cause: parentUpdateErr,
    });
  }

  return {
    batchProjectIds,
    parentProjectId: baseProject.id,
  };
}

export type { BatchStyleKey } from './style-overrides';
export { BATCH_STYLE_KEYS, STYLE_OVERRIDES } from './style-overrides';
