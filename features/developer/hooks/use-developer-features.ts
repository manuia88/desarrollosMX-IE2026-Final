'use client';

import { useMemo } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

// FASE 15.A.3 — Feature gating via resolve_features SQL function (per ctx.user.id).
// Returns flags: dev.projects_max, dev.ai_extractions_month, dev.pricing_autopilot,
// dev.absorption_forecast, dev.competitive_intel, dev.predictions_tab, dev.api_access, ...
//
// resolve_features() returns string[] of feature codes. We expose has() helper plus the raw set.

export type DeveloperFeatures = {
  readonly isLoading: boolean;
  readonly features: ReadonlySet<string>;
  readonly has: (feature: string) => boolean;
};

export function useDeveloperFeatures(): DeveloperFeatures {
  const { data, isLoading } = trpc.me.features.list.useQuery(undefined, {
    staleTime: 5 * 60_000,
    retry: false,
  });

  return useMemo<DeveloperFeatures>(() => {
    const set = new Set<string>((data as string[] | undefined) ?? []);
    return {
      isLoading,
      features: set,
      has: (feature) => set.has(feature),
    };
  }, [data, isLoading]);
}
