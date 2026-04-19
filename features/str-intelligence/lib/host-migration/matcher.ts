// Host Migration Matcher — FASE 07b / BLOQUE 7b.J.
//
// Detecta listings que cambiaron de plataforma (Airbnb → VRBO / Booking)
// agrupando por firma cross-platform:
//   hash(geom_10m + bedrooms + bathrooms + capacity + title_tokens)
//
// Output: pares (from, to) con confidence basado en cuántas features matchean.
//
// Pure: NO toca BD ni red. Input es array de listings normalizados.

export interface ListingFingerprint {
  readonly platform: 'airbnb' | 'vrbo' | 'booking';
  readonly listing_id: string;
  readonly host_id: string | null;
  readonly market_id: string | null;
  readonly zone_id: string | null;
  readonly lon: number;
  readonly lat: number;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly capacity: number | null;
  readonly listing_name: string | null;
  readonly first_seen_at: string;
}

export interface MigrationMatch {
  readonly from_platform: 'airbnb' | 'vrbo' | 'booking';
  readonly from_listing_id: string;
  readonly from_host_id: string | null;
  readonly to_platform: 'airbnb' | 'vrbo' | 'booking';
  readonly to_listing_id: string;
  readonly to_host_id: string | null;
  readonly market_id: string | null;
  readonly zone_id: string | null;
  readonly signature_hash: string;
  readonly confidence: number;
  readonly match_features: {
    readonly geom_match: boolean;
    readonly bedrooms_match: boolean;
    readonly bathrooms_match: boolean;
    readonly capacity_match: boolean;
    readonly title_token_overlap_pct: number;
  };
}

const GEOM_GRID_M = 10;
const TITLE_TOKEN_MIN_LENGTH = 4;

// Snap (lon, lat) to a 10m grid cell — coarse signature key.
function geomGridKey(lon: number, lat: number): string {
  // ~111_320 m per degree of latitude → 10m ≈ 8.98e-5 deg.
  const step = GEOM_GRID_M / 111_320;
  const lonCell = Math.round(lon / step);
  const latCell = Math.round(lat / step);
  return `${lonCell}:${latCell}`;
}

function tokenize(s: string | null): Set<string> {
  if (!s) return new Set();
  const tokens = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= TITLE_TOKEN_MIN_LENGTH);
  return new Set(tokens);
}

function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Hash determinista (FNV-1a 32-bit) para signature_hash.
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function buildSignatureHash(l: ListingFingerprint): string {
  const parts = [
    geomGridKey(l.lon, l.lat),
    String(l.bedrooms ?? 'x'),
    String(l.bathrooms ?? 'x'),
    String(l.capacity ?? 'x'),
  ].join('|');
  return fnv1a(parts);
}

function matchesScore(
  a: ListingFingerprint,
  b: ListingFingerprint,
): {
  confidence: number;
  features: MigrationMatch['match_features'];
} {
  const geomMatch = geomGridKey(a.lon, a.lat) === geomGridKey(b.lon, b.lat);
  const bedroomsMatch = a.bedrooms != null && b.bedrooms != null && a.bedrooms === b.bedrooms;
  const bathroomsMatch = a.bathrooms != null && b.bathrooms != null && a.bathrooms === b.bathrooms;
  const capacityMatch = a.capacity != null && b.capacity != null && a.capacity === b.capacity;

  const tokensA = tokenize(a.listing_name);
  const tokensB = tokenize(b.listing_name);
  const titleOverlap = jaccardOverlap(tokensA, tokensB);

  // Confidence formula:
  //   geom_match (mandatory): 0.5 base.
  //   + 0.10 si bedrooms.
  //   + 0.10 si bathrooms.
  //   + 0.10 si capacity.
  //   + 0.20 × title_overlap (max 0.20).
  let confidence = 0;
  if (geomMatch) {
    confidence = 0.5;
    if (bedroomsMatch) confidence += 0.1;
    if (bathroomsMatch) confidence += 0.1;
    if (capacityMatch) confidence += 0.1;
    confidence += titleOverlap * 0.2;
  }

  return {
    confidence: Math.min(1, Math.max(0, Math.round(confidence * 1000) / 1000)),
    features: {
      geom_match: geomMatch,
      bedrooms_match: bedroomsMatch,
      bathrooms_match: bathroomsMatch,
      capacity_match: capacityMatch,
      title_token_overlap_pct: Math.round(titleOverlap * 1000) / 1000,
    },
  };
}

export interface MatchOptions {
  readonly minConfidence?: number;
  // Si el listing FROM se vio antes que el TO por > minDelayDays, considerar
  // migración. Si TO existe antes que FROM, dirección invertida.
  readonly minDelayDays?: number;
}

export function detectHostMigrations(
  fingerprints: readonly ListingFingerprint[],
  options: MatchOptions = {},
): MigrationMatch[] {
  const minConfidence = options.minConfidence ?? 0.7;
  const minDelayDays = options.minDelayDays ?? 0;
  const minDelayMs = minDelayDays * 24 * 3600 * 1000;

  // Bucketize por geom-grid key + bedrooms + capacity para reducir comparaciones.
  const buckets = new Map<string, ListingFingerprint[]>();
  for (const f of fingerprints) {
    const key = `${geomGridKey(f.lon, f.lat)}|${f.bedrooms ?? 'x'}|${f.capacity ?? 'x'}`;
    const arr = buckets.get(key);
    if (arr) arr.push(f);
    else buckets.set(key, [f]);
  }

  const matches: MigrationMatch[] = [];
  for (const [, bucket] of buckets) {
    if (bucket.length < 2) continue;
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const a = bucket[i];
        const b = bucket[j];
        if (!a || !b) continue;
        if (a.platform === b.platform) continue;

        const ts = matchesScore(a, b);
        if (ts.confidence < minConfidence) continue;

        // Direccionalidad: el listing más viejo es FROM.
        const aTs = Date.parse(a.first_seen_at);
        const bTs = Date.parse(b.first_seen_at);
        if (Number.isNaN(aTs) || Number.isNaN(bTs)) continue;
        const delta = Math.abs(aTs - bTs);
        if (delta < minDelayMs) continue;

        const from = aTs <= bTs ? a : b;
        const to = aTs <= bTs ? b : a;

        matches.push({
          from_platform: from.platform,
          from_listing_id: from.listing_id,
          from_host_id: from.host_id,
          to_platform: to.platform,
          to_listing_id: to.listing_id,
          to_host_id: to.host_id,
          market_id: from.market_id ?? to.market_id ?? null,
          zone_id: from.zone_id ?? to.zone_id ?? null,
          signature_hash: buildSignatureHash(from),
          confidence: ts.confidence,
          match_features: ts.features,
        });
      }
    }
  }
  return matches;
}
