import type { IngestCtx, QualityGate, QualityGateResult } from './types';

// Upgrade #1 §5.A FASE 07. Gates pre-INSERT obligatorios en orchestrator.

export interface RowCountSanityOpts {
  lastSuccessfulCount?: number;
  multiplier?: number;
  min?: number;
}

export const rowCountSanityGate = <T>({
  lastSuccessfulCount,
  multiplier = 10,
  min = 0,
}: RowCountSanityOpts = {}): QualityGate<T> => ({
  name: 'row_count_sanity',
  check(rows): QualityGateResult {
    if (rows.length <= min) {
      return { ok: false, reason: `row_count_below_min: got ${rows.length}, min=${min}` };
    }
    if (typeof lastSuccessfulCount === 'number' && lastSuccessfulCount > 0) {
      const cap = lastSuccessfulCount * multiplier;
      if (rows.length > cap) {
        return {
          ok: false,
          reason: `row_count_explosion: got ${rows.length}, cap=${cap} (${multiplier}× last=${lastSuccessfulCount})`,
        };
      }
    }
    return { ok: true };
  },
});

// MX bounding box (continental). Aprueba si todos los puntos caen dentro.
const MX_BBOX = { minLat: 14.5, maxLat: 32.8, minLng: -118.4, maxLng: -86.7 };

export const geoValidityGateMx = <
  T extends { lat?: number | null; lng?: number | null },
>(): QualityGate<T> => ({
  name: 'geo_validity_mx_bbox',
  check(rows): QualityGateResult {
    let bad = 0;
    for (const r of rows) {
      if (typeof r.lat !== 'number' || typeof r.lng !== 'number') continue;
      if (
        r.lat < MX_BBOX.minLat ||
        r.lat > MX_BBOX.maxLat ||
        r.lng < MX_BBOX.minLng ||
        r.lng > MX_BBOX.maxLng
      ) {
        bad++;
      }
    }
    if (bad === 0) return { ok: true };
    const pct = (bad / Math.max(1, rows.length)) * 100;
    if (pct > 10) {
      return { ok: false, reason: `geo_outside_bbox: ${bad}/${rows.length} (${pct.toFixed(1)}%)` };
    }
    return { ok: true, meta: { warnings: bad, pct } };
  },
});

export const duplicateDetectionGate = <T>(naturalKey: (row: T) => string): QualityGate<T> => ({
  name: 'duplicate_detection',
  check(rows): QualityGateResult {
    const seen = new Set<string>();
    let dupes = 0;
    for (const r of rows) {
      const k = naturalKey(r);
      if (seen.has(k)) dupes++;
      else seen.add(k);
    }
    if (dupes === 0) return { ok: true };
    const pct = (dupes / Math.max(1, rows.length)) * 100;
    if (pct > 50) {
      return {
        ok: false,
        reason: `dedup_explosion: ${dupes}/${rows.length} duplicates (${pct.toFixed(1)}%)`,
      };
    }
    return { ok: true, meta: { duplicates: dupes, pct } };
  },
});

// z-score outlier flagging. NO rechaza el batch — anota outliers como meta
// para que el orchestrator pueda incluirlos en row.meta.is_outlier=true.
export const outlierFlagGate = <T>(numericValue: (row: T) => number | null): QualityGate<T> => ({
  name: 'outlier_flag_zscore',
  check(rows): QualityGateResult {
    const vals = rows.map(numericValue).filter((v): v is number => typeof v === 'number');
    if (vals.length < 10) return { ok: true };
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance) || 1;
    const outliers = vals.filter((v) => Math.abs((v - mean) / std) > 3).length;
    return { ok: true, meta: { outliers, mean, std } };
  },
});

export async function runQualityGates<T>(
  rows: T[],
  gates: QualityGate<T>[],
  ctx: IngestCtx,
): Promise<{
  ok: boolean;
  failures: { gate: string; reason: string }[];
  warnings: Record<string, unknown>;
}> {
  const failures: { gate: string; reason: string }[] = [];
  const warnings: Record<string, unknown> = {};
  for (const gate of gates) {
    const r = await gate.check(rows, ctx);
    if (!r.ok) {
      failures.push({ gate: gate.name, reason: r.reason ?? 'unknown' });
    } else if (r.meta) {
      warnings[gate.name] = r.meta;
    }
  }
  return { ok: failures.length === 0, failures, warnings };
}
