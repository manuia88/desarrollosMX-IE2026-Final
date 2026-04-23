'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { VitalSignsComparison } from '@/features/pulse-score/components/VitalSignsComparison';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { cn } from '@/shared/ui/primitives/cn';
import type { WidgetCustomization, WidgetScopeType } from '../types';
import { WidgetShell } from './WidgetShell';

export interface WidgetPulseCompareProps {
  readonly scopeType: WidgetScopeType;
  readonly scopeIdA: string;
  readonly scopeIdB: string;
  readonly customization?: WidgetCustomization | undefined;
  readonly ctaUrl: string;
  readonly className?: string;
}

export function WidgetPulseCompare({
  scopeType,
  scopeIdA,
  scopeIdB,
  customization,
  ctaUrl,
  className,
}: WidgetPulseCompareProps) {
  const t = useTranslations('WidgetEmbed');

  const labelA = useMemo(
    () => resolveZoneLabelSync({ scopeType, scopeId: scopeIdA }),
    [scopeType, scopeIdA],
  );
  const labelB = useMemo(
    () => resolveZoneLabelSync({ scopeType, scopeId: scopeIdB }),
    [scopeType, scopeIdB],
  );

  return (
    <WidgetShell
      customization={customization}
      ctaUrl={ctaUrl}
      ctaLabel={t('common.cta_view_full')}
      poweredByLabel={t('common.powered_by')}
      ariaLabel={t('pulse_compare.aria_label', { zoneA: labelA, zoneB: labelB })}
      className={cn('dmx-widget-pulse-compare', className)}
    >
      <VitalSignsComparison
        scopeA={{ scopeType, scopeId: scopeIdA }}
        scopeB={{ scopeType, scopeId: scopeIdB }}
      />
    </WidgetShell>
  );
}
