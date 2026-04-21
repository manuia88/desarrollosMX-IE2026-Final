'use client';

import { trpc } from '@/shared/lib/trpc/client';
import type { MigrationDirection, MigrationScopeType } from '../types';

const STALE_TIME_10M = 10 * 60 * 1000;
const DEFAULT_COUNTRY = 'MX';
const DEFAULT_SCOPE_TYPE: MigrationScopeType = 'colonia';
const DEFAULT_FLOWS_FOR_ZONE_LIMIT = 20;
const DEFAULT_TOP_FLOWS_LIMIT = 10;
const DEFAULT_FLOW_MAP_LIMIT = 200;

export interface UseFlowsForZoneOptions {
  readonly scopeType: MigrationScopeType;
  readonly scopeId: string;
  readonly direction: MigrationDirection;
  readonly country?: string;
  readonly periodDate?: string;
  readonly limit?: number;
  readonly enabled?: boolean;
}

export interface UseTopFlowsOptions {
  readonly country?: string;
  readonly scopeType?: MigrationScopeType;
  readonly limit?: number;
  readonly periodDate?: string;
  readonly incomeDecileMin?: number;
  readonly incomeDecileMax?: number;
  readonly enabled?: boolean;
}

export interface UseFlowMapOptions {
  readonly country?: string;
  readonly scopeType?: MigrationScopeType;
  readonly periodDate?: string;
  readonly limit?: number;
  readonly incomeDecileMin?: number;
  readonly incomeDecileMax?: number;
  readonly enabled?: boolean;
}

export function useFlowsForZone(opts: UseFlowsForZoneOptions) {
  return trpc.migrationFlow.getFlowsForZone.useQuery(
    {
      zoneId: opts.scopeId,
      scopeType: opts.scopeType,
      direction: opts.direction,
      country: opts.country ?? DEFAULT_COUNTRY,
      limit: opts.limit ?? DEFAULT_FLOWS_FOR_ZONE_LIMIT,
      ...(opts.periodDate !== undefined ? { periodDate: opts.periodDate } : {}),
    },
    { enabled: opts.enabled ?? true, staleTime: STALE_TIME_10M },
  );
}

export function useTopFlows(opts: UseTopFlowsOptions) {
  return trpc.migrationFlow.getTopFlows.useQuery(
    {
      country: opts.country ?? DEFAULT_COUNTRY,
      scopeType: opts.scopeType ?? DEFAULT_SCOPE_TYPE,
      limit: opts.limit ?? DEFAULT_TOP_FLOWS_LIMIT,
      ...(opts.periodDate !== undefined ? { periodDate: opts.periodDate } : {}),
      ...(opts.incomeDecileMin !== undefined ? { incomeDecileMin: opts.incomeDecileMin } : {}),
      ...(opts.incomeDecileMax !== undefined ? { incomeDecileMax: opts.incomeDecileMax } : {}),
    },
    { enabled: opts.enabled ?? true, staleTime: STALE_TIME_10M },
  );
}

export function useFlowMap(opts: UseFlowMapOptions) {
  return trpc.migrationFlow.getFlowMap.useQuery(
    {
      country: opts.country ?? DEFAULT_COUNTRY,
      scopeType: opts.scopeType ?? DEFAULT_SCOPE_TYPE,
      limit: opts.limit ?? DEFAULT_FLOW_MAP_LIMIT,
      ...(opts.periodDate !== undefined ? { periodDate: opts.periodDate } : {}),
      ...(opts.incomeDecileMin !== undefined ? { incomeDecileMin: opts.incomeDecileMin } : {}),
      ...(opts.incomeDecileMax !== undefined ? { incomeDecileMax: opts.incomeDecileMax } : {}),
    },
    { enabled: opts.enabled ?? true, staleTime: STALE_TIME_10M },
  );
}
