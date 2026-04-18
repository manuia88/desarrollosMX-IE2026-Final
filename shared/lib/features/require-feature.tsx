'use client';

import type { ReactNode } from 'react';
import { useFeatures } from '@/shared/hooks/useFeatures';
import { LockedFeatureCard } from '@/shared/ui/locked-feature';

type RequireFeatureProps = {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequireFeature({ feature, children, fallback }: RequireFeatureProps) {
  const { has, isLoading } = useFeatures();
  if (isLoading) return null;
  if (has(feature)) return <>{children}</>;
  return <>{fallback ?? <LockedFeatureCard feature={feature} />}</>;
}

export function requireFeature<TProps extends object>(
  feature: string,
  Component: (props: TProps) => ReactNode,
) {
  return function Wrapped(props: TProps) {
    return (
      <RequireFeature feature={feature}>
        <Component {...props} />
      </RequireFeature>
    );
  };
}
