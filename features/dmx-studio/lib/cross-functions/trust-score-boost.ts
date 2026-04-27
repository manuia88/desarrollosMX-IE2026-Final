// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Cross-function 2: Trust Score boost desde Studio (STUB ADR-018).
// FASE 14.F.4 Sprint 3 — EXTEND con Copy Pack bonus (UPGRADE 10 LATERAL).
//
// Objetivo H2 (post F14.F.2+): cuando una desarrolladora publique su primer
// video Studio (count(studio_video_projects WHERE published) >= 1 per
// desarrolladora), aplicar un boost de +5 pts al overall_score de
// dev_trust_scores como señal de transparencia visual + post-venta.
//
// EXTENSION (Sprint 3): Copy Pack bonus +2 pts adicional a doc_transparency
// cuando la desarrolladora cumple los 3 criterios:
//   - >= 5 studio_video_projects status='published'
//   - Cada project tiene Copy Pack completo (todos los channels generados)
//   - Al menos un Copy Regeneration aplicado (señal uso engaged del producto)
//
// Activación condicional pendiente:
//   1. studio_video_projects debe tener filas reales (Sprint 2+ Studio).
//   2. Migration ALTER TABLE dev_trust_scores ADD COLUMN studio_boost_applied
//      bool default false (idempotencia).
//   3. Cron diario o webhook Studio → trigger boost al primer published.
//   4. Update breakdown jsonb sumando contribución Studio bajo
//      key 'studio_video_signal' (no machacar reviews ni post_venta).
//   5. Sprint 3 EXTEND: sumar 'studio_copy_pack_signal' bajo doc_transparency.
//
// STUB ADR-018 — activar L-NEW-STUDIO-TRUST-BOOST en F14.F.2+.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export type AdminSupabase = SupabaseClient<Database>;

export interface TrustScoreBoostResult {
  readonly applied: boolean;
  readonly reason: string;
  readonly boostPoints: number;
  readonly threshold: number;
}

export interface StudioCopyPackBonusResult {
  readonly bonusPoints: number;
  readonly reason: string;
  readonly publishedProjectsCount: number;
  readonly hasCompleteCopyPacks: boolean;
  readonly hasCopyRegeneration: boolean;
}

export const STUDIO_TRUST_BOOST_POINTS = 5 as const;
export const STUDIO_TRUST_BOOST_THRESHOLD_PUBLISHED_VIDEOS = 1 as const;
export const STUDIO_COPY_PACK_BONUS_POINTS = 2 as const;
export const STUDIO_COPY_PACK_BONUS_THRESHOLD_PROJECTS = 5 as const;

export async function applyTrustScoreBoostFromStudio(
  // STUB ADR-018 — Studio Trust Score boost no activable hasta H2 (F14.F.2+).
  // Mantener firma estable para que callers (cron + webhook) ya importen.
  _supabase: unknown,
  _desarrolladoraId: string,
): Promise<TrustScoreBoostResult> {
  return {
    applied: false,
    reason:
      'STUB-NOT-ACTIVE — studio_video_projects no tiene rows reales aún, activable L-NEW-STUDIO-TRUST-BOOST en F14.F.2+',
    boostPoints: STUDIO_TRUST_BOOST_POINTS,
    threshold: STUDIO_TRUST_BOOST_THRESHOLD_PUBLISHED_VIDEOS,
  };
}

// FASE 14.F.4 Sprint 3 — UPGRADE 10 LATERAL: Copy Pack bonus calculator.
// Retorna 2 pts si cumple los 3 criterios (publishedProjects>=5 + completeCopyPacks
// + copyRegeneration). Caller (cron H2) suma a doc_transparency en breakdown.
export async function calculateStudioCopyPackBonus(
  supabase: AdminSupabase,
  desarrolladoraId: string,
): Promise<StudioCopyPackBonusResult> {
  // 1. Map desarrolladora → users via profiles.desarrolladora_id (proxy hasta H2
  //    cuando agreguemos studio_organizations.desarrolladora_id direct FK).
  const profilesResp = await supabase
    .from('profiles')
    .select('id')
    .eq('desarrolladora_id', desarrolladoraId);
  if (profilesResp.error) {
    throw new Error(
      `calculateStudioCopyPackBonus profiles fetch failed: ${profilesResp.error.message}`,
    );
  }
  const userIds = (profilesResp.data ?? []).map((p) => p.id);
  if (userIds.length === 0) {
    return {
      bonusPoints: 0,
      reason: 'no-users-for-desarrolladora',
      publishedProjectsCount: 0,
      hasCompleteCopyPacks: false,
      hasCopyRegeneration: false,
    };
  }

  // 2. Count published projects across desarrolladora users.
  const projectsResp = await supabase
    .from('studio_video_projects')
    .select('id', { count: 'exact' })
    .in('user_id', userIds)
    .eq('status', 'published');
  if (projectsResp.error) {
    throw new Error(
      `calculateStudioCopyPackBonus projects count failed: ${projectsResp.error.message}`,
    );
  }
  const publishedProjectsCount = projectsResp.count ?? 0;

  if (publishedProjectsCount < STUDIO_COPY_PACK_BONUS_THRESHOLD_PROJECTS) {
    return {
      bonusPoints: 0,
      reason: `STUB-NOT-ACTIVE — published projects ${publishedProjectsCount} < threshold ${STUDIO_COPY_PACK_BONUS_THRESHOLD_PROJECTS}, activable L-NEW-STUDIO-TRUST-BOOST H2`,
      publishedProjectsCount,
      hasCompleteCopyPacks: false,
      hasCopyRegeneration: false,
    };
  }

  // 3. Heurística complete copy pack: existe al menos N filas en studio_copy_outputs
  //    (un output por channel × project) para los projects de la desarrolladora.
  //    STUB ADR-018: la query verifica presencia, no completeness real (channels
  //    coverage). Activar verificación granular en L-NEW-STUDIO-TRUST-BOOST H2.
  const projectIdsResp = await supabase
    .from('studio_video_projects')
    .select('id')
    .in('user_id', userIds)
    .eq('status', 'published');
  if (projectIdsResp.error) {
    throw new Error(
      `calculateStudioCopyPackBonus project ids fetch failed: ${projectIdsResp.error.message}`,
    );
  }
  const projectIds = (projectIdsResp.data ?? []).map((p) => p.id);

  let hasCompleteCopyPacks = false;
  let hasCopyRegeneration = false;
  if (projectIds.length > 0) {
    const copyOutputsResp = await supabase
      .from('studio_copy_outputs')
      .select('id, project_id')
      .in('project_id', projectIds);
    if (copyOutputsResp.error) {
      throw new Error(
        `calculateStudioCopyPackBonus copy_outputs fetch failed: ${copyOutputsResp.error.message}`,
      );
    }
    const copyOutputs = copyOutputsResp.data ?? [];
    // Heurística: cada project debe tener >=1 output (placeholder Sprint 3, granular H2).
    const projectsWithOutputs = new Set(copyOutputs.map((o) => o.project_id));
    hasCompleteCopyPacks = projectsWithOutputs.size >= projectIds.length;

    const outputIds = copyOutputs.map((o) => o.id);
    if (outputIds.length > 0) {
      const copyVersionsResp = await supabase
        .from('studio_copy_versions')
        .select('id', { count: 'exact', head: true })
        .in('copy_output_id', outputIds);
      if (copyVersionsResp.error) {
        throw new Error(
          `calculateStudioCopyPackBonus copy_versions count failed: ${copyVersionsResp.error.message}`,
        );
      }
      // Regeneration signal: at least one version row beyond the initial generated one per output.
      hasCopyRegeneration = (copyVersionsResp.count ?? 0) > outputIds.length;
    }
  }

  const allCriteriaMet =
    publishedProjectsCount >= STUDIO_COPY_PACK_BONUS_THRESHOLD_PROJECTS &&
    hasCompleteCopyPacks &&
    hasCopyRegeneration;

  return {
    bonusPoints: allCriteriaMet ? STUDIO_COPY_PACK_BONUS_POINTS : 0,
    reason: allCriteriaMet
      ? 'criteria-met-stub-not-applied — boost calculation only, write deferred to L-NEW-STUDIO-TRUST-BOOST H2'
      : 'STUB-NOT-ACTIVE — copy pack criteria incomplete, activable L-NEW-STUDIO-TRUST-BOOST H2',
    publishedProjectsCount,
    hasCompleteCopyPacks,
    hasCopyRegeneration,
  };
}
