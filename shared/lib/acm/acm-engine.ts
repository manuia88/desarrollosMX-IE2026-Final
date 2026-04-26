import { createHash } from 'node:crypto';
import { ACM_WEIGHTS, type AcmBreakdown, type AcmInput, type AcmResult } from './types';

function priceFit(precioSolicitado: number, precioMediana: number | undefined): number {
  if (precioMediana === undefined || precioMediana <= 0) return 0.5;
  const ratio = precioSolicitado / precioMediana;
  if (ratio >= 0.9 && ratio <= 1.1) return 1;
  if (ratio < 0.9) {
    if (ratio >= 0.8) return 0.85;
    if (ratio >= 0.65) return 0.65;
    if (ratio >= 0.5) return 0.4;
    return 0.2;
  }
  if (ratio <= 1.2) return 0.7;
  if (ratio <= 1.35) return 0.4;
  if (ratio <= 1.6) return 0.2;
  return 0.05;
}

function zoneScoreFn(
  zoneId: string | null | undefined,
  zonePulseScore: number | undefined,
): { value: number; fallback: boolean } {
  if (!zoneId) return { value: 0.5, fallback: true };
  if (zonePulseScore === undefined || zonePulseScore === null) {
    return { value: 0.5, fallback: true };
  }
  const clamped = Math.max(0, Math.min(1, zonePulseScore));
  return { value: clamped, fallback: false };
}

function amenitiesFn(propias: string[], mediana: string[]): number {
  if (mediana.length === 0) return 0.6;
  const set = new Set(mediana.map((a) => a.toLowerCase()));
  let hits = 0;
  for (const a of propias) {
    if (set.has(a.toLowerCase())) hits++;
  }
  if (set.size === 0) return 0.6;
  const coverage = hits / set.size;
  return Math.max(0, Math.min(1, coverage));
}

function sizeFitFn(area: number | undefined, areaMediana: number | undefined): number {
  if (area === undefined || areaMediana === undefined || areaMediana <= 0) return 0.5;
  if (area <= 0) return 0.2;
  const ratio = area / areaMediana;
  if (ratio >= 0.9 && ratio <= 1.1) return 1;
  if (ratio < 0.9) {
    if (ratio >= 0.75) return 0.8;
    if (ratio >= 0.55) return 0.55;
    return 0.3;
  }
  if (ratio <= 1.25) return 0.8;
  if (ratio <= 1.5) return 0.55;
  return 0.3;
}

function discZoneFn(
  discZonaScore: number | undefined,
  discProfile: AcmInput['discProfile'],
): number {
  if (discZonaScore === undefined && discProfile === undefined) return 0.5;
  if (discZonaScore !== undefined) {
    return Math.max(0, Math.min(1, discZonaScore));
  }
  return 0.5;
}

function buildRationale(
  breakdown: AcmBreakdown,
  hasFallback: boolean,
  precioSolicitado: number,
  precioMediana: number | undefined,
): string[] {
  const out: string[] = [];
  if (breakdown.priceFit >= 0.95) {
    out.push('rationale.priceFair');
  } else if (precioMediana !== undefined && precioMediana > 0) {
    if (precioSolicitado < precioMediana) out.push('rationale.priceUnder');
    else out.push('rationale.priceOver');
  }

  if (hasFallback) {
    out.push('rationale.zoneWeak');
  } else if (breakdown.zoneScore >= 0.7) out.push('rationale.zoneStrong');
  else if (breakdown.zoneScore < 0.4) out.push('rationale.zoneWeak');

  if (breakdown.amenities >= 0.7) out.push('rationale.amenitiesRich');
  else if (breakdown.amenities < 0.35) out.push('rationale.amenitiesScarce');

  if (breakdown.sizeFit >= 0.95) out.push('rationale.sizeMatchesMedian');
  else if (breakdown.sizeFit < 0.55) out.push('rationale.sizeOff');

  if (breakdown.discZone >= 0.7) out.push('rationale.discAligned');
  else out.push('rationale.discNeutral');

  return out;
}

function hashInputs(input: AcmInput): string {
  const canonical = JSON.stringify({
    precioSolicitado: input.precioSolicitado,
    precioMedianaZona: input.precioMedianaZona ?? null,
    zoneId: input.zoneId ?? null,
    zonePulseScore: input.zonePulseScore ?? null,
    amenidadesPropiedad: [...input.amenidadesPropiedad].sort(),
    amenidadesMedianaZona: [...input.amenidadesMedianaZona].sort(),
    areaM2: input.areaM2 ?? null,
    areaMedianaZona: input.areaMedianaZona ?? null,
    discZonaScore: input.discZonaScore ?? null,
    discProfile: input.discProfile ?? null,
    tipoOperacion: input.tipoOperacion,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function runACM(input: AcmInput, opts?: { now?: string }): AcmResult {
  const price = priceFit(input.precioSolicitado, input.precioMedianaZona);
  const zone = zoneScoreFn(input.zoneId, input.zonePulseScore);
  const amen = amenitiesFn(input.amenidadesPropiedad, input.amenidadesMedianaZona);
  const size = sizeFitFn(input.areaM2, input.areaMedianaZona);
  const disc = discZoneFn(input.discZonaScore, input.discProfile);

  const breakdown: AcmBreakdown = {
    priceFit: price,
    zoneScore: zone.value,
    amenities: amen,
    sizeFit: size,
    discZone: disc,
  };

  const score = Math.round(
    (price * ACM_WEIGHTS.priceFit +
      zone.value * ACM_WEIGHTS.zoneScore +
      amen * ACM_WEIGHTS.amenities +
      size * ACM_WEIGHTS.sizeFit +
      disc * ACM_WEIGHTS.discZone) *
      100,
  );

  return {
    score,
    breakdown,
    rationale: buildRationale(
      breakdown,
      zone.fallback,
      input.precioSolicitado,
      input.precioMedianaZona,
    ),
    weights: ACM_WEIGHTS,
    inputsHash: hashInputs(input),
    computedAt: opts?.now ?? '1970-01-01T00:00:00.000Z',
    hasFallbackZoneScore: zone.fallback,
  };
}
