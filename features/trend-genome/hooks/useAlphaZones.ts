'use client';

import { trpc } from '@/shared/lib/trpc/client';
import type { AlphaTier } from '../types';

const STALE_TIME_10M = 10 * 60 * 1000;
const DEFAULT_COUNTRY = 'MX';
const DEFAULT_ZONES_LIMIT = 20;

export interface UseAlphaCountOptions {
  readonly country?: string;
  readonly enabled?: boolean;
}

export interface UseAlphaZonesOptions {
  readonly country?: string;
  readonly limit?: number;
  readonly minScore?: number;
  readonly tier?: AlphaTier;
  readonly enabled?: boolean;
}

export interface UseAlphaZoneDetailOptions {
  readonly zoneId: string;
  readonly country?: string;
  readonly enabled?: boolean;
}

export function useAlphaCount(opts: UseAlphaCountOptions = {}) {
  return trpc.trendGenome.getAlphaCount.useQuery(
    { country: opts.country ?? DEFAULT_COUNTRY },
    { enabled: opts.enabled ?? true, staleTime: STALE_TIME_10M },
  );
}

export function useAlphaZones(opts: UseAlphaZonesOptions = {}) {
  return trpc.trendGenome.getAlphaZones.useQuery(
    {
      country: opts.country ?? DEFAULT_COUNTRY,
      scopeType: 'colonia',
      limit: opts.limit ?? DEFAULT_ZONES_LIMIT,
      ...(opts.minScore !== undefined ? { minScore: opts.minScore } : {}),
      ...(opts.tier !== undefined ? { tier: opts.tier } : {}),
    },
    {
      enabled: opts.enabled ?? true,
      staleTime: STALE_TIME_10M,
      retry: false,
    },
  );
}

export function useAlphaZoneDetail(opts: UseAlphaZoneDetailOptions) {
  return trpc.trendGenome.getAlphaZoneDetail.useQuery(
    {
      zoneId: opts.zoneId,
      country: opts.country ?? DEFAULT_COUNTRY,
    },
    {
      enabled: opts.enabled ?? true,
      staleTime: STALE_TIME_10M,
      retry: false,
    },
  );
}
