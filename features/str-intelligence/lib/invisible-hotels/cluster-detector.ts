// Invisible Hotel Detection — FASE 07b / BLOQUE 7b.E.
//
// Composite detector que combina:
//   1. host_id_proximity: ≥5 listings del mismo host en radio ≤200m
//      (vía SQL detect_invisible_hotel_candidates).
//   2. name_prefix_match: listings con prefijo común (regex) — booster
//      de confidence si el host_id es null o cambia entre listings.
//   3. (futuro 7b.H) photo_pattern_match: clusters por hash de fotos.
//
// Confidence formula:
//   base = host_id_match ? 0.7 : 0.4
//   + 0.10 si name_prefix_match
//   + 0.10 si listings_count ≥ 10
//   - 0.20 si bounding_radius < 50m (single-building → más probable
//      property manager legítimo, no hotel invisible).
//   clamp [0..1].
//
// Pure function: input candidates from SQL + listings metadata, output
// cluster records prontos para INSERT.

export interface CandidateCluster {
  readonly host_id: string;
  readonly market_id: string | null;
  readonly listings_count: number;
  readonly center_lon: number;
  readonly center_lat: number;
  readonly bounding_radius_m: number;
  readonly listing_ids: readonly string[];
  // Listings metadata para heurísticas secundarias (nombres, fotos, etc).
  readonly listings_meta?: readonly {
    readonly listing_id: string;
    readonly listing_name: string | null;
  }[];
}

export interface DetectedCluster {
  readonly host_id: string;
  readonly market_id: string | null;
  readonly listings_count: number;
  readonly center_lon: number;
  readonly center_lat: number;
  readonly bounding_radius_m: number;
  readonly listing_ids: readonly string[];
  readonly detection_method:
    | 'host_id_proximity'
    | 'name_prefix_match'
    | 'photo_pattern_match'
    | 'composite';
  readonly confidence: number;
  readonly heuristics: {
    readonly host_id_match: boolean;
    readonly name_prefix_match: boolean;
    readonly common_prefix?: string;
    readonly tight_cluster: boolean; // radius < 50m
  };
}

const TIGHT_CLUSTER_THRESHOLD_M = 50;
const COMMON_PREFIX_MIN_LISTINGS_RATIO = 0.6;
const COMMON_PREFIX_MIN_LENGTH = 6;

function findCommonPrefix(names: readonly string[]): string | undefined {
  if (names.length < 3) return undefined;
  const cleanedNames = names
    .map((n) => n.trim())
    .filter((n): n is string => n.length >= COMMON_PREFIX_MIN_LENGTH);
  if (cleanedNames.length < 3) return undefined;

  // Token-based prefix detection — case insensitive, primer-token con stop-words filter.
  // Approach simple: encuentra el prefix más largo común a ≥60% de los nombres.
  const lower = cleanedNames.map((n) => n.toLowerCase());
  const maxPrefixLen = Math.min(...lower.map((n) => n.length));
  let bestPrefix = '';
  for (let len = COMMON_PREFIX_MIN_LENGTH; len <= maxPrefixLen; len += 1) {
    const candidate = lower[0]?.slice(0, len);
    if (!candidate) break;
    const matches = lower.filter((n) => n.startsWith(candidate)).length;
    const ratio = matches / lower.length;
    if (ratio >= COMMON_PREFIX_MIN_LISTINGS_RATIO) {
      bestPrefix = candidate;
    } else {
      break;
    }
  }
  return bestPrefix.length >= COMMON_PREFIX_MIN_LENGTH ? bestPrefix : undefined;
}

export function classifyCluster(candidate: CandidateCluster): DetectedCluster {
  const hostIdMatch = candidate.host_id.trim().length > 0;
  const tightCluster = candidate.bounding_radius_m < TIGHT_CLUSTER_THRESHOLD_M;

  let commonPrefix: string | undefined;
  if (candidate.listings_meta && candidate.listings_meta.length > 0) {
    const names = candidate.listings_meta
      .map((l) => l.listing_name)
      .filter((n): n is string => !!n && n.trim().length > 0);
    commonPrefix = findCommonPrefix(names);
  }
  const namePrefixMatch = !!commonPrefix;

  let confidence = hostIdMatch ? 0.7 : 0.4;
  if (namePrefixMatch) confidence += 0.1;
  if (candidate.listings_count >= 10) confidence += 0.1;
  if (tightCluster) confidence -= 0.2;

  // Clamp [0..1]
  confidence = Math.max(0, Math.min(1, confidence));

  const detectionMethod: DetectedCluster['detection_method'] = (() => {
    if (hostIdMatch && namePrefixMatch) return 'composite';
    if (hostIdMatch) return 'host_id_proximity';
    if (namePrefixMatch) return 'name_prefix_match';
    return 'host_id_proximity';
  })();

  return {
    host_id: candidate.host_id,
    market_id: candidate.market_id,
    listings_count: candidate.listings_count,
    center_lon: candidate.center_lon,
    center_lat: candidate.center_lat,
    bounding_radius_m: candidate.bounding_radius_m,
    listing_ids: candidate.listing_ids,
    detection_method: detectionMethod,
    confidence: Math.round(confidence * 1000) / 1000,
    heuristics: {
      host_id_match: hostIdMatch,
      name_prefix_match: namePrefixMatch,
      ...(commonPrefix ? { common_prefix: commonPrefix } : {}),
      tight_cluster: tightCluster,
    },
  };
}

export function classifyClusters(candidates: readonly CandidateCluster[]): DetectedCluster[] {
  return candidates.map(classifyCluster);
}
