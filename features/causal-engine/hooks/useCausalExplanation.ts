'use client';

import { trpc } from '@/shared/lib/trpc/client';
import type { IndexCode, ScopeType } from '../types';

export interface UseCausalExplanationOptions {
  readonly scoreId: string;
  readonly indexCode: IndexCode;
  readonly scopeType: ScopeType;
  readonly scopeId: string;
  readonly periodDate?: string;
  readonly enabled?: boolean;
}

const STALE_TIME_30M = 30 * 60 * 1000;

export function useCausalExplanation(opts: UseCausalExplanationOptions) {
  const enabled = opts.enabled ?? true;
  return trpc.causal.getExplanation.useQuery(
    {
      scoreId: opts.scoreId,
      indexCode: opts.indexCode,
      scopeType: opts.scopeType,
      scopeId: opts.scopeId,
      ...(opts.periodDate !== undefined ? { periodDate: opts.periodDate } : {}),
    },
    { enabled, staleTime: STALE_TIME_30M },
  );
}
