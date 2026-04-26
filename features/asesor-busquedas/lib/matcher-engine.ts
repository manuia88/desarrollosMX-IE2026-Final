import type { BusquedaCriteria } from './filter-schemas';

export type DiscProfile = 'D' | 'I' | 'S' | 'C';

export interface UnidadCandidate {
  unidadId: string;
  proyectoId: string;
  proyectoZoneId: string | null;
  proyectoAmenities: string[];
  proyectoCiudad: string | null;
  unidadRecamaras: number | null;
  unidadPriceMxn: number | null;
}

export interface MatchScoreBreakdown {
  priceFit: number;
  zoneIE: number;
  amenitiesMatch: number;
  familyFit: number;
  discZone: number;
}

export interface MatchScore {
  unidadId: string;
  proyectoId: string;
  total: number;
  breakdown: MatchScoreBreakdown;
  rationale: string[];
}

export interface MatcherInput {
  criteria: BusquedaCriteria;
  candidates: UnidadCandidate[];
  zoneScores: Map<string, number>;
  discProfile?: DiscProfile | undefined;
  familySize?: number | undefined;
}

const W_PRICE = 0.3;
const W_ZONE = 0.25;
const W_AMEN = 0.2;
const W_FAMILY = 0.15;
const W_DISC = 0.1;

function priceFit(price: number | null, min: number | undefined, max: number | undefined): number {
  if (price === null || price === undefined) return 0.4;
  if (min === undefined && max === undefined) return 0.7;
  const lo = min ?? 0;
  const hi = max ?? Number.POSITIVE_INFINITY;
  if (price >= lo && price <= hi) return 1;
  if (price < lo) {
    const ratio = lo === 0 ? 1 : price / lo;
    return Math.max(0, ratio);
  }
  const overage = (price - hi) / Math.max(hi, 1);
  if (overage <= 0.1) return 0.7;
  if (overage <= 0.2) return 0.4;
  if (overage <= 0.5) return 0.15;
  return 0;
}

function zoneIE(zoneId: string | null, zoneScores: Map<string, number>): number {
  if (!zoneId) return 0.5;
  const raw = zoneScores.get(zoneId);
  if (raw === undefined || raw === null) return 0.5;
  const clamped = Math.max(0, Math.min(100, raw));
  return clamped / 100;
}

function amenitiesMatch(target: string[], available: string[]): number {
  if (target.length === 0) return 0.6;
  if (available.length === 0) return 0.1;
  const set = new Set(available.map((a) => a.toLowerCase()));
  let hits = 0;
  for (const t of target) {
    if (set.has(t.toLowerCase())) hits++;
  }
  return hits / target.length;
}

function familyFit(
  unidadRecamaras: number | null,
  reqMin: number | undefined,
  reqMax: number | undefined,
  familySize: number | undefined,
): number {
  if (unidadRecamaras === null || unidadRecamaras === undefined) return 0.4;
  const min = reqMin ?? 0;
  const max = reqMax ?? 10;
  if (unidadRecamaras < min) {
    return Math.max(0, 1 - (min - unidadRecamaras) * 0.4);
  }
  if (unidadRecamaras > max) {
    return Math.max(0.3, 1 - (unidadRecamaras - max) * 0.2);
  }
  if (familySize !== undefined && familySize > 0) {
    const ideal = Math.max(1, Math.ceil(familySize / 2));
    if (unidadRecamaras >= ideal) return 1;
    return Math.max(0.3, unidadRecamaras / ideal);
  }
  return 1;
}

function discZoneFit(disc: DiscProfile | undefined, zoneIeScore: number): number {
  if (!disc) return 0.5;
  switch (disc) {
    case 'D':
      return zoneIeScore >= 0.7 ? 1 : 0.45;
    case 'I':
      return zoneIeScore >= 0.55 ? 0.85 : 0.5;
    case 'S':
      return zoneIeScore >= 0.4 && zoneIeScore <= 0.85 ? 0.9 : 0.5;
    case 'C':
      return zoneIeScore >= 0.6 ? 0.95 : 0.55;
    default:
      return 0.5;
  }
}

function buildRationale(
  breakdown: MatchScoreBreakdown,
  candidate: UnidadCandidate,
  criteria: BusquedaCriteria,
): string[] {
  const out: string[] = [];
  if (breakdown.priceFit >= 0.9) out.push('rationale.priceInRange');
  else if (breakdown.priceFit >= 0.6) out.push('rationale.priceClose');
  else if (breakdown.priceFit < 0.3) out.push('rationale.priceFar');
  if (breakdown.zoneIE >= 0.7) out.push('rationale.zoneStrong');
  else if (breakdown.zoneIE >= 0.5) out.push('rationale.zoneModerate');
  if (breakdown.amenitiesMatch >= 0.7) out.push('rationale.amenitiesMatch');
  else if (criteria.amenities.length > 0 && breakdown.amenitiesMatch < 0.3)
    out.push('rationale.amenitiesGap');
  if (breakdown.familyFit >= 0.9) out.push('rationale.familyFit');
  if (breakdown.discZone >= 0.85) out.push('rationale.discAligned');
  if (
    criteria.ciudades.length > 0 &&
    candidate.proyectoCiudad &&
    criteria.ciudades.some(
      (c) => c.toLowerCase() === (candidate.proyectoCiudad ?? '').toLowerCase(),
    )
  ) {
    out.push('rationale.cityPreferred');
  }
  return out;
}

export function computeMatch(input: MatcherInput, candidate: UnidadCandidate): MatchScore {
  const { criteria, zoneScores, discProfile, familySize } = input;
  const price = priceFit(candidate.unidadPriceMxn, criteria.price_min, criteria.price_max);
  const zone = zoneIE(candidate.proyectoZoneId, zoneScores);
  const amen = amenitiesMatch(criteria.amenities, candidate.proyectoAmenities);
  const family = familyFit(
    candidate.unidadRecamaras,
    criteria.recamaras_min,
    criteria.recamaras_max,
    familySize,
  );
  const disc = discZoneFit(discProfile, zone);
  const breakdown: MatchScoreBreakdown = {
    priceFit: price,
    zoneIE: zone,
    amenitiesMatch: amen,
    familyFit: family,
    discZone: disc,
  };
  const total = Math.round(
    (price * W_PRICE + zone * W_ZONE + amen * W_AMEN + family * W_FAMILY + disc * W_DISC) * 100,
  );
  return {
    unidadId: candidate.unidadId,
    proyectoId: candidate.proyectoId,
    total,
    breakdown,
    rationale: buildRationale(breakdown, candidate, criteria),
  };
}

export function runMatcher(input: MatcherInput): MatchScore[] {
  return input.candidates.map((c) => computeMatch(input, c)).sort((a, b) => b.total - a.total);
}

export const MATCHER_WEIGHTS = {
  priceFit: W_PRICE,
  zoneIE: W_ZONE,
  amenitiesMatch: W_AMEN,
  familyFit: W_FAMILY,
  discZone: W_DISC,
} as const;
