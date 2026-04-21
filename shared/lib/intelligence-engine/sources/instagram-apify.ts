// Instagram Apify ingestion — BLOQUE 11.H Trend Genome sub-agent A (11.H.1).
// Fetch public geo-tagged Instagram posts via Apify REST (no client library).
// ADR-027 compliance:
//   - verified: true accounts only
//   - public locationId geo-tags only
//   - handles SHA-256 hashed with salt = `${countryCode}:${periodDate}`
//   - Rate-limit guard: refuse > MAX_API_CALLS_PER_ZONE per zone per run
//
// Per-zone budget: 1 API call (list posts w/ geo-tag filter), 50 posts analyzed.

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AlphaScopeType, InstagramHeatSignals } from '@/features/trend-genome/types';

const APIFY_ACTOR = 'apify~instagram-scraper';
const APIFY_ENDPOINT = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items`;
const APIFY_RESULTS_LIMIT = 50;
const MAX_API_CALLS_PER_ZONE = 50;
const MIN_CREATOR_FOLLOWERS = 5000;

const CHEF_KEYWORDS = ['chef', 'restaurant', 'kitchen', 'culinary'] as const;
const GALLERY_KEYWORDS = ['gallery', 'galeria', 'art', 'arte', 'curator'] as const;
const SPECIALTY_CAFE_KEYWORDS = [
  'specialty coffee',
  'slow coffee',
  'barista',
  'cafe especialidad',
] as const;

export interface FetchInstagramParams {
  readonly zoneId: string;
  readonly scopeType: AlphaScopeType;
  readonly countryCode: string;
  readonly period: string; // ISO date YYYY-MM-DD (period_date)
  readonly supabase: SupabaseClient;
  readonly fetchImpl?: typeof fetch;
  readonly apifyToken?: string;
}

// ---------- Utilities ----------

export function hashHandle(handle: string, salt: string): string {
  return createHash('sha256').update(`${handle}${salt}`).digest('hex');
}

function zeroSignals(limitation: string | null): InstagramHeatSignals {
  return {
    chef_count: 0,
    gallery_count: 0,
    creator_count: 0,
    specialty_cafe_count: 0,
    raw_handles_hashed: [],
    source_confidence: 0,
    limitation,
  };
}

function containsKeyword(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();
  for (const k of keywords) {
    if (lower.includes(k)) return true;
  }
  return false;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function toStringOrEmpty(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function toNumberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function toBoolean(v: unknown): boolean {
  return v === true;
}

// ---------- Apify post shape (narrowed from unknown) ----------

interface ApifyPost {
  readonly handle: string;
  readonly verified: boolean;
  readonly followerCount: number;
  readonly bio: string;
  readonly caption: string;
  readonly locationId: string | null;
  readonly venueName: string;
}

function extractPost(raw: unknown): ApifyPost | null {
  if (!isRecord(raw)) return null;

  const ownerRaw = raw.ownerUsername ?? raw.username ?? raw.owner_username;
  const handle = toStringOrEmpty(ownerRaw);
  if (handle.length === 0) return null;

  const verifiedRaw = raw.ownerVerified ?? raw.verified ?? raw.isVerified;
  const verified = toBoolean(verifiedRaw);

  const followerRaw =
    raw.ownerFollowerCount ?? raw.followerCount ?? raw.followers ?? raw.followers_count;
  const followerCount = toNumberOr(followerRaw, 0);

  const bio = toStringOrEmpty(raw.ownerBio ?? raw.bio ?? raw.biography);
  const caption = toStringOrEmpty(raw.caption ?? raw.text);

  const locationRaw = raw.locationId ?? raw.location_id ?? raw.locationID;
  const locationId =
    typeof locationRaw === 'string' && locationRaw.length > 0
      ? locationRaw
      : typeof locationRaw === 'number'
        ? String(locationRaw)
        : null;

  const venueName = toStringOrEmpty(raw.locationName ?? raw.venueName ?? raw.location_name);

  return { handle, verified, followerCount, bio, caption, locationId, venueName };
}

// ---------- Classification ----------

type Category = 'chef' | 'gallery' | 'creator' | null;

function classifyPost(post: ApifyPost): Category {
  if (!post.verified) return null;
  const textBlob = `${post.bio} ${post.caption}`;
  if (containsKeyword(textBlob, CHEF_KEYWORDS)) return 'chef';
  if (containsKeyword(textBlob, GALLERY_KEYWORDS)) return 'gallery';
  if (post.followerCount >= MIN_CREATOR_FOLLOWERS) return 'creator';
  return null;
}

function isSpecialtyCafe(post: ApifyPost): boolean {
  const blob = `${post.venueName} ${post.caption}`;
  return containsKeyword(blob, SPECIALTY_CAFE_KEYWORDS);
}

// ---------- Source confidence heuristic ----------

function computeConfidence(totalRecognized: number): number {
  // 0 recognized → 0 (caller will set limitation). Otherwise scale with sample
  // size, cap at 0.9 (never 1.0 — Instagram signal inherently noisy).
  if (totalRecognized === 0) return 0;
  return Math.min(0.9, 0.5 + totalRecognized / 50);
}

// ---------- Main export ----------

export async function fetchInstagramPublicGeotags(
  p: FetchInstagramParams,
): Promise<InstagramHeatSignals> {
  const token = p.apifyToken ?? process.env.APIFY_TOKEN;
  if (!token || token.length === 0) {
    return zeroSignals('APIFY_TOKEN_MISSING');
  }

  const fetchImpl = p.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    return zeroSignals('APIFY_NETWORK_ERROR');
  }

  // Rate-limit guard: 1 call/zone by design. Defensive reject of any attempt
  // to exceed MAX_API_CALLS_PER_ZONE (caller logic bug).
  const apiCallsThisRun = 1;
  if (apiCallsThisRun > MAX_API_CALLS_PER_ZONE) {
    return zeroSignals('APIFY_RATE_LIMIT_EXCEEDED');
  }

  const url = `${APIFY_ENDPOINT}?token=${encodeURIComponent(token)}`;
  const directUrl = `https://www.instagram.com/explore/locations/?zone=${encodeURIComponent(p.zoneId)}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls: [directUrl],
        resultsLimit: APIFY_RESULTS_LIMIT,
      }),
    });
  } catch {
    return zeroSignals('APIFY_NETWORK_ERROR');
  }

  if (!response.ok) {
    return zeroSignals('APIFY_NETWORK_ERROR');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return zeroSignals('APIFY_NETWORK_ERROR');
  }

  if (!Array.isArray(payload)) {
    return zeroSignals('APIFY_NETWORK_ERROR');
  }

  const posts: ApifyPost[] = [];
  for (const raw of payload) {
    const post = extractPost(raw);
    if (!post) continue;
    if (post.locationId === null) continue;
    posts.push(post);
  }

  if (posts.length === 0) {
    return zeroSignals('NO_PUBLIC_GEOTAGS');
  }

  // Salt = `${countryCode}:${periodDate}` per ADR-027 doc string.
  const salt = `${p.countryCode}:${p.period}`;

  let chefCount = 0;
  let galleryCount = 0;
  let creatorCount = 0;
  let specialtyCafeCount = 0;
  const hashedHandles = new Set<string>();

  for (const post of posts) {
    const category = classifyPost(post);
    if (category === 'chef') chefCount += 1;
    else if (category === 'gallery') galleryCount += 1;
    else if (category === 'creator') creatorCount += 1;

    if (isSpecialtyCafe(post)) specialtyCafeCount += 1;

    if (category !== null || isSpecialtyCafe(post)) {
      hashedHandles.add(hashHandle(post.handle, salt));
    }
  }

  const totalRecognized = chefCount + galleryCount + creatorCount + specialtyCafeCount;
  const sourceConfidence = computeConfidence(totalRecognized);

  return {
    chef_count: chefCount,
    gallery_count: galleryCount,
    creator_count: creatorCount,
    specialty_cafe_count: specialtyCafeCount,
    raw_handles_hashed: Array.from(hashedHandles),
    source_confidence: sourceConfidence,
    limitation: totalRecognized === 0 ? 'NO_PUBLIC_GEOTAGS' : null,
  };
}
