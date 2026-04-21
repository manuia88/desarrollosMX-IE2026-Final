'use client';

import { trpc } from '@/shared/lib/trpc/client';
import type { PulseScopeType } from '../types';

const STALE_TIME_10M = 10 * 60 * 1000;
const DEFAULT_COUNTRY = 'MX';
const DEFAULT_HISTORY_MONTHS = 12;

export interface UsePulseScoreOptions {
  readonly scopeType: PulseScopeType;
  readonly scopeId: string;
  readonly country?: string;
  readonly periodDate?: string;
  readonly enabled?: boolean;
}

export interface UsePulseHistoryOptions extends UsePulseScoreOptions {
  readonly months?: number;
}

export function usePulseScore(opts: UsePulseScoreOptions) {
  return trpc.pulse.getPulseScore.useQuery(
    {
      scopeType: opts.scopeType,
      scopeId: opts.scopeId,
      country: opts.country ?? DEFAULT_COUNTRY,
      ...(opts.periodDate !== undefined ? { periodDate: opts.periodDate } : {}),
    },
    { enabled: opts.enabled ?? true, staleTime: STALE_TIME_10M },
  );
}

export function usePulseHistory(opts: UsePulseHistoryOptions) {
  return trpc.pulse.getPulseHistory.useQuery(
    {
      scopeType: opts.scopeType,
      scopeId: opts.scopeId,
      country: opts.country ?? DEFAULT_COUNTRY,
      months: opts.months ?? DEFAULT_HISTORY_MONTHS,
    },
    { enabled: opts.enabled ?? true, staleTime: STALE_TIME_10M },
  );
}
