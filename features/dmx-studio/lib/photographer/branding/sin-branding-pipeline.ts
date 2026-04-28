// F14.F.10 Sprint 9 BIBLIA — Sin-branding pipeline para Plan Fotógrafo (B2B2C).
// Compose video-pipeline F14.F.2 (read-only) + plan-logic F14.F.3 (read-only).
// Foto plan default unbranded → fotógrafo entrega clean video al cliente asesor,
// quien aplica SU brand kit en download. Persist studio_video_outputs.is_branded=false.

import { applyUnbrandedExport } from '@/features/dmx-studio/lib/assembler/branding';
import { shouldApplyBranding } from '@/features/dmx-studio/lib/assembler/branding/plan-logic';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface GenerateUnbrandedVideoInput {
  readonly projectId: string;
  readonly photographerId: string;
  readonly sourceVideoPath: string;
  readonly outputPath: string;
}

export interface GenerateUnbrandedVideoResult {
  readonly ok: boolean;
  readonly projectId: string;
  readonly outputPath: string;
  readonly isBranded: false;
  readonly hasBrandingOverlay: false;
}

type AdminClient = ReturnType<typeof createAdminClient>;

export interface GenerateUnbrandedVideoDeps {
  readonly client?: AdminClient;
  readonly runUnbrandedExport?: typeof applyUnbrandedExport;
}

/**
 * Genera video unbranded para fotógrafo Foto plan.
 * Flag is_branded=false en studio_video_outputs (cliente asesor aplicará SU brand
 * kit en download, fuera de este pipeline).
 *
 * Plan validation: solo Foto plan ejecuta este path. Pro/Agency siguen pipeline
 * branded F14.F.3 estándar via shouldApplyBranding(plan, null).
 */
export async function generateUnbrandedVideo(
  input: GenerateUnbrandedVideoInput,
  deps: GenerateUnbrandedVideoDeps = {},
): Promise<GenerateUnbrandedVideoResult> {
  const supabase = deps.client ?? createAdminClient();
  const exporter = deps.runUnbrandedExport ?? applyUnbrandedExport;

  // Verificación canon plan-logic F14.F.3: Foto plan default unbranded.
  const branded = shouldApplyBranding('foto', null);
  if (branded) {
    throw new Error('sin_branding_pipeline.invalid_plan_default: Foto plan must be unbranded');
  }

  const { data: photographer, error: photographerErr } = await supabase
    .from('studio_photographers')
    .select('id, user_id')
    .eq('id', input.photographerId)
    .maybeSingle();

  if (photographerErr) {
    sentry.captureException(photographerErr, {
      tags: {
        feature: 'dmx-studio.photographer.branding',
        op: 'generateUnbranded.fetchPhotographer',
      },
      extra: { projectId: input.projectId, photographerId: input.photographerId },
    });
    throw new Error(`sin_branding_pipeline.fetch_photographer_failed: ${photographerErr.message}`);
  }

  if (!photographer) {
    throw new Error('sin_branding_pipeline.photographer_not_found');
  }

  try {
    const exportResult = await exporter(input.sourceVideoPath, input.outputPath);
    if (!exportResult.ok || exportResult.hasBrandingOverlay) {
      throw new Error('sin_branding_pipeline.unexpected_export_state');
    }

    const { error: insertErr } = await supabase.from('studio_video_outputs').insert({
      project_id: input.projectId,
      user_id: photographer.user_id,
      format: '9x16',
      hook_variant: 'photographer_unbranded',
      storage_url: input.outputPath,
      render_status: 'completed',
      is_branded: false,
      has_branding_overlay: false,
    });

    if (insertErr) {
      sentry.captureException(insertErr, {
        tags: { feature: 'dmx-studio.photographer.branding', op: 'generateUnbranded.insertOutput' },
        extra: { projectId: input.projectId, photographerId: input.photographerId },
      });
      throw new Error(`sin_branding_pipeline.insert_output_failed: ${insertErr.message}`);
    }

    return {
      ok: true,
      projectId: input.projectId,
      outputPath: input.outputPath,
      isBranded: false,
      hasBrandingOverlay: false,
    };
  } catch (err) {
    sentry.captureException(err, {
      tags: { feature: 'dmx-studio.photographer.branding', op: 'generateUnbranded' },
      extra: { projectId: input.projectId, photographerId: input.photographerId },
    });
    throw err;
  }
}

export const __test__ = {
  PLAN_KEY_FOTO: 'foto' as const,
};
