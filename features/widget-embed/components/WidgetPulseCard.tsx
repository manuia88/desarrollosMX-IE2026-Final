'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { VitalSigns } from '@/features/pulse-score/components';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { cn } from '@/shared/ui/primitives/cn';
import type { WidgetCustomization, WidgetScopeType } from '../types';
import { WidgetShell } from './WidgetShell';

export interface WidgetPulseCardProps {
  readonly scopeType: WidgetScopeType;
  readonly scopeId: string;
  readonly customization?: WidgetCustomization | undefined;
  readonly ctaUrl: string;
  readonly className?: string;
}

export function WidgetPulseCard({
  scopeType,
  scopeId,
  customization,
  ctaUrl,
  className,
}: WidgetPulseCardProps) {
  const t = useTranslations('WidgetEmbed');
  const zoneLabel = useMemo(
    () => resolveZoneLabelSync({ scopeType, scopeId }),
    [scopeType, scopeId],
  );

  return (
    <WidgetShell
      customization={customization}
      ctaUrl={ctaUrl}
      ctaLabel={t('common.cta_view_full')}
      poweredByLabel={t('common.powered_by')}
      ariaLabel={t('pulse.aria_label', { zone: zoneLabel })}
      className={cn('dmx-widget-pulse', className)}
    >
      <VitalSigns scopeType={scopeType} scopeId={scopeId} />
    </WidgetShell>
  );
}
