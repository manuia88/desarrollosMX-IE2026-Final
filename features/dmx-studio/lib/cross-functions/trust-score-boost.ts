// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Cross-function 2: Trust Score boost desde Studio (STUB ADR-018).
//
// Objetivo H2 (post F14.F.2+): cuando una desarrolladora publique su primer
// video Studio (count(studio_video_projects WHERE published) >= 1 per
// desarrolladora), aplicar un boost de +5 pts al overall_score de
// dev_trust_scores como señal de transparencia visual + post-venta.
//
// Activación condicional pendiente:
//   1. studio_video_projects debe tener filas reales (Sprint 2+ Studio).
//   2. Migration ALTER TABLE dev_trust_scores ADD COLUMN studio_boost_applied
//      bool default false (idempotencia).
//   3. Cron diario o webhook Studio → trigger boost al primer published.
//   4. Update breakdown jsonb sumando contribución Studio bajo
//      key 'studio_video_signal' (no machacar reviews ni post_venta).
//
// STUB ADR-018 — activar L-NEW-STUDIO-TRUST-BOOST en F14.F.2+.

export interface TrustScoreBoostResult {
  readonly applied: boolean;
  readonly reason: string;
  readonly boostPoints: number;
  readonly threshold: number;
}

export const STUDIO_TRUST_BOOST_POINTS = 5 as const;
export const STUDIO_TRUST_BOOST_THRESHOLD_PUBLISHED_VIDEOS = 1 as const;

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
