// PR-D D.3 — Climate disclosure badge canon-aware.
//
// Renderiza disclosure honesta del status del dato climático (heuristic, pending
// validation, validated NOAA+CONAGUA, outlier discrepancia entre fuentes).
//
// Wire status (PR-D D.3):
//   - Stand-alone canónico, listo para consumo desde:
//       (a) Atlas wiki page  — `app/[locale]/(public)/atlas/[coloniaSlug]/page.tsx`
//           Wire pendiente: page actual NO renderiza datos climáticos directos
//           (solo markdown sections). Wire opportunity emergerá cuando se agregue
//           sección Clima estructurada al wiki entry render (follow-up PR).
//       (b) Ficha colonia M01 (asesor) — features/asesor-dashboard/ — wire pendiente.
//       (c) M17 widgets — features/widget-embed/ — wire pendiente.
//
// Reusa `DisclosurePill` canon (`shared/ui/primitives/canon/`).

'use client';

import { useTranslations } from 'next-intl';
import { DisclosurePill, type DisclosureTone } from '@/shared/ui/primitives/canon';

export type ClimateSource = 'noaa' | 'conagua' | 'heuristic_v1' | (string & {});

export type ClimateCrossValidationStatus =
  | 'cross_validated_match'
  | 'cross_validated_outlier_noaa_winner'
  | 'cross_validated_outlier_conagua_winner'
  | 'pending'
  | (string & {});

export interface ClimateBadgeProps {
  readonly source: ClimateSource;
  readonly crossValidationStatus?: ClimateCrossValidationStatus;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

interface BadgeResolution {
  readonly tone: DisclosureTone;
  readonly labelKey: 'modelSeed' | 'outlierWarning' | 'validated';
  readonly tooltipKey: 'modelSeedTooltip' | 'outlierWarning' | 'validated';
}

function resolveBadge(
  source: ClimateSource,
  crossValidationStatus: ClimateCrossValidationStatus | undefined,
): BadgeResolution {
  if (source === 'heuristic_v1' || crossValidationStatus === 'pending') {
    return { tone: 'amber', labelKey: 'modelSeed', tooltipKey: 'modelSeedTooltip' };
  }
  if (
    crossValidationStatus === 'cross_validated_outlier_noaa_winner' ||
    crossValidationStatus === 'cross_validated_outlier_conagua_winner'
  ) {
    return { tone: 'amber', labelKey: 'outlierWarning', tooltipKey: 'outlierWarning' };
  }
  if (crossValidationStatus === 'cross_validated_match') {
    return { tone: 'indigo', labelKey: 'validated', tooltipKey: 'validated' };
  }
  return { tone: 'indigo', labelKey: 'validated', tooltipKey: 'validated' };
}

export function ClimateBadge({
  source,
  crossValidationStatus,
  size = 'md',
  className,
}: ClimateBadgeProps) {
  const t = useTranslations('Atlas.disclosure.climate');
  const resolution = resolveBadge(source, crossValidationStatus);
  const label = t(resolution.labelKey);
  const tooltip = t(resolution.tooltipKey);

  const sizeStyle =
    size === 'sm'
      ? { padding: '2px 8px', fontSize: '10px' }
      : { padding: '3px 10px', fontSize: '11px' };

  const propsToPass: Parameters<typeof DisclosurePill>[0] = {
    tone: resolution.tone,
    title: tooltip,
    'aria-label': tooltip,
    style: sizeStyle,
    children: label,
  };
  if (className !== undefined) {
    propsToPass.className = className;
  }

  return <DisclosurePill {...propsToPass} />;
}

export default ClimateBadge;
