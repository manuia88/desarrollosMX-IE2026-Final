'use client';

import type { ReactNode } from 'react';
import { type UpgradePlan, UpgradePrompt } from '@/features/developer/components/UpgradePrompt';
import { useDeveloperFeatures } from '@/features/developer/hooks/use-developer-features';

export type FeatureGateProps = {
  readonly feature: string;
  readonly plan?: UpgradePlan;
  readonly fallback?: ReactNode;
  readonly children: ReactNode;
};

export function FeatureGate({ feature, plan = 'pro', fallback, children }: FeatureGateProps) {
  const { has, isLoading } = useDeveloperFeatures();

  if (isLoading) return null;
  if (has(feature)) return <>{children}</>;

  return <>{fallback ?? <UpgradePrompt plan={plan} feature={feature} />}</>;
}
