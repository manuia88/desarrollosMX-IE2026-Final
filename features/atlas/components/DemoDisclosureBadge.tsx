// PR-D D.3 — Demographics disclosure badge canon-aware.
//
// Renderiza disclosure honesta del status del dato demográfico (proxy/downscaled
// H1 vs INEGI AGEB overlay alta confianza H2).
//
// Valores reales de `data_origin` en BD:
//   - 'inegi_municipal_proxy'                                      → amber (proxy H1)
//   - 'inegi_ageb_overlay'                                         → indigo (H2 alta confianza)
//   - 'enigh_2022_state_downscaled_via_censo_2020_proxy'           → amber (downscaled)
//   - 'enigh_synthetic_v1'                                         → amber (synthetic)
//
// Wire status (PR-D D.3):
//   - Stand-alone canónico, listo para consumo desde:
//       (a) Atlas wiki page  — `app/[locale]/(public)/atlas/[coloniaSlug]/page.tsx`
//           Wire pendiente: page actual NO renderiza demographics directos
//           (solo markdown sections). Wire opportunity emergerá cuando se agregue
//           sección Demografía estructurada al wiki entry render (follow-up PR).
//       (b) Ficha colonia M01 (asesor) — features/asesor-dashboard/ — wire pendiente.
//       (c) M17 widgets — features/widget-embed/ — wire pendiente.
//
// Reusa `DisclosurePill` canon (`shared/ui/primitives/canon/`).

'use client';

import { useTranslations } from 'next-intl';
import { DisclosurePill, type DisclosureTone } from '@/shared/ui/primitives/canon';

export type DemoDataOrigin =
  | 'inegi_municipal_proxy'
  | 'inegi_ageb_overlay'
  | 'enigh_2022_state_downscaled_via_censo_2020_proxy'
  | 'enigh_synthetic_v1'
  | (string & {});

export interface DemoDisclosureBadgeProps {
  readonly dataOrigin: DemoDataOrigin;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

interface BadgeResolution {
  readonly tone: DisclosureTone;
  readonly labelKey: 'estimacion' | 'agebOverlay';
  readonly tooltipKey: 'estimacionTooltip' | 'agebOverlay';
}

function resolveBadge(dataOrigin: DemoDataOrigin): BadgeResolution {
  if (dataOrigin === 'inegi_ageb_overlay') {
    return { tone: 'indigo', labelKey: 'agebOverlay', tooltipKey: 'agebOverlay' };
  }
  const lower = dataOrigin.toLowerCase();
  if (lower.includes('proxy') || lower.includes('downscaled') || lower.includes('synthetic')) {
    return { tone: 'amber', labelKey: 'estimacion', tooltipKey: 'estimacionTooltip' };
  }
  return { tone: 'indigo', labelKey: 'agebOverlay', tooltipKey: 'agebOverlay' };
}

export function DemoDisclosureBadge({
  dataOrigin,
  size = 'md',
  className,
}: DemoDisclosureBadgeProps) {
  const t = useTranslations('Atlas.disclosure.demographics');
  const resolution = resolveBadge(dataOrigin);
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

export default DemoDisclosureBadge;
