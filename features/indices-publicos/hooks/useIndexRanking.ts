'use client';

import { trpc } from '@/shared/lib/trpc/client';
import type { IndexCode, ScopeType } from '@/shared/types/scores';
import type { CountryCode, PeriodType } from '../lib/index-registry-helpers';

const STALE_TIME_5M = 5 * 60 * 1000;

export interface UseIndexRankingOptions {
  readonly indexCode: IndexCode;
  readonly scopeType?: ScopeType;
  readonly countryCode?: CountryCode;
  readonly periodDate?: string;
  readonly periodType?: PeriodType;
  readonly limit?: number;
  readonly enabled?: boolean;
}

export function useIndexRanking(options: UseIndexRankingOptions) {
  const enabled = options.enabled ?? true;
  return trpc.indicesPublic.getRanking.useQuery(
    {
      indexCode: options.indexCode,
      scopeType: options.scopeType ?? 'colonia',
      countryCode: options.countryCode ?? 'MX',
      periodType: options.periodType ?? 'monthly',
      limit: options.limit ?? 100,
      ...(options.periodDate !== undefined ? { periodDate: options.periodDate } : {}),
    },
    {
      enabled,
      staleTime: STALE_TIME_5M,
    },
  );
}

export interface UseIndexMoversOptions {
  readonly direction?: 'up' | 'down';
  readonly scopeType?: ScopeType;
  readonly countryCode?: CountryCode;
  readonly periodDate?: string;
  readonly limit?: number;
  readonly enabled?: boolean;
}

export function useIndexMovers(options: UseIndexMoversOptions = {}) {
  const enabled = options.enabled ?? true;
  return trpc.indicesPublic.getMovers.useQuery(
    {
      direction: options.direction ?? 'up',
      scopeType: options.scopeType ?? 'colonia',
      countryCode: options.countryCode ?? 'MX',
      limit: options.limit ?? 8,
      ...(options.periodDate !== undefined ? { periodDate: options.periodDate } : {}),
    },
    {
      enabled,
      staleTime: STALE_TIME_5M,
    },
  );
}

export interface UseIndexDetailOptions {
  readonly indexCode: IndexCode;
  readonly scopeType: ScopeType;
  readonly scopeId: string;
  readonly countryCode?: CountryCode;
  readonly periodDate?: string;
  readonly enabled?: boolean;
}

export function useIndexDetail(options: UseIndexDetailOptions) {
  const enabled = Boolean(options.scopeId) && (options.enabled ?? true);
  return trpc.indicesPublic.getIndexDetail.useQuery(
    {
      indexCode: options.indexCode,
      scopeType: options.scopeType,
      scopeId: options.scopeId,
      countryCode: options.countryCode ?? 'MX',
      ...(options.periodDate !== undefined ? { periodDate: options.periodDate } : {}),
    },
    {
      enabled,
      staleTime: STALE_TIME_5M,
    },
  );
}
