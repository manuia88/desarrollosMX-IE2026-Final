// F14.F.9 Sprint 8 BIBLIA Upgrade 5 — Multi-camera angles.
// Seedance multi-shot 12 refs simulando: wide / medium / close-up / drone aerial / detail.

import { TRPCError } from '@trpc/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';

export type MultiCameraAngle = 'wide' | 'medium' | 'close_up' | 'drone_aerial' | 'detail';

export interface GenerateMultiAngleClipResult {
  readonly assetId: string;
  readonly seedanceJobId: string | null;
  readonly anglesGenerated: ReadonlyArray<MultiCameraAngle>;
  readonly costUsd: number;
  readonly status: 'pending';
}

const COST_PER_ANGLE_USD = 0.12;

export async function generateMultiAngleClip(
  userId: string,
  assetId: string,
  angles: ReadonlyArray<MultiCameraAngle>,
): Promise<GenerateMultiAngleClipResult> {
  const supabase = createAdminClient();
  const { data: asset } = await supabase
    .from('studio_video_assets')
    .select('id, project_id, storage_url')
    .eq('id', assetId)
    .maybeSingle();
  if (!asset) throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset not found' });

  const { data: project } = await supabase
    .from('studio_video_projects')
    .select('user_id')
    .eq('id', asset.project_id)
    .maybeSingle();
  if (!project || project.user_id !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  const totalCost = COST_PER_ANGLE_USD * angles.length;
  const { data: job } = await supabase
    .from('studio_api_jobs')
    .insert({
      user_id: userId,
      provider: 'fal_ai',
      job_type: 'seedance_multi_camera',
      status: 'pending',
      estimated_cost_usd: totalCost,
      input_payload: {
        asset_id: assetId,
        angles,
        source_storage_url: asset.storage_url,
      } as never,
    })
    .select('id')
    .single();

  return {
    assetId,
    seedanceJobId: job?.id ?? null,
    anglesGenerated: angles,
    costUsd: totalCost,
    status: 'pending',
  };
}
