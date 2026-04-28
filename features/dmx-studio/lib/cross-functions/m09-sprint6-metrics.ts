// F14.F.7 Sprint 6 UPGRADE 11 CROSS-FN — M09 Sprint 6 KPIs aggregator (PURE).
// Pure aggregator function — no DB calls. M09 router queries supabase y pasa
// arrays crudos; este lib calcula totals + buckets + ventana 30d determinística.
// Permite testing puro vía vitest sin mocks de supabase.

import { z } from 'zod';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WINDOW_30D_MS = 30 * MS_PER_DAY;

export const Sprint6MetricsRowSchema = z.object({
  virtual_stagings_total: z.number().int().nonnegative(),
  virtual_stagings_last_30d: z.number().int().nonnegative(),
  drone_simulations_total: z.number().int().nonnegative(),
  drone_simulations_by_pattern: z.record(z.string(), z.number().int().nonnegative()),
  seedance_clips_total: z.number().int().nonnegative(),
  cinema_mode_projects: z.number().int().nonnegative(),
});

export type Sprint6Metrics = z.infer<typeof Sprint6MetricsRowSchema>;

export interface AggregateSprint6MetricsInput {
  readonly stagings: ReadonlyArray<{ created_at: string }>;
  readonly drones: ReadonlyArray<{ simulation_type: string }>;
  readonly clips: ReadonlyArray<unknown>;
  readonly cinemaProjects: number;
  /**
   * Optional clock injection para tests deterministas. Defaults to Date.now().
   */
  readonly nowMs?: number;
}

export function aggregateSprint6Metrics(input: AggregateSprint6MetricsInput): Sprint6Metrics {
  const now = typeof input.nowMs === 'number' ? input.nowMs : Date.now();
  const cutoff = now - WINDOW_30D_MS;

  let stagingsLast30d = 0;
  for (const s of input.stagings) {
    const t = Date.parse(s.created_at);
    if (Number.isFinite(t) && t >= cutoff) {
      stagingsLast30d += 1;
    }
  }

  const dronesByPattern: Record<string, number> = {};
  for (const d of input.drones) {
    const key = typeof d.simulation_type === 'string' && d.simulation_type.length > 0
      ? d.simulation_type
      : 'unknown';
    dronesByPattern[key] = (dronesByPattern[key] ?? 0) + 1;
  }

  const cinema = Number.isFinite(input.cinemaProjects) ? Math.max(0, Math.trunc(input.cinemaProjects)) : 0;

  const result: Sprint6Metrics = {
    virtual_stagings_total: input.stagings.length,
    virtual_stagings_last_30d: stagingsLast30d,
    drone_simulations_total: input.drones.length,
    drone_simulations_by_pattern: dronesByPattern,
    seedance_clips_total: input.clips.length,
    cinema_mode_projects: cinema,
  };

  return Sprint6MetricsRowSchema.parse(result);
}
