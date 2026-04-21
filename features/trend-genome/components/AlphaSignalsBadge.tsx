'use client';

import { useTranslations } from 'next-intl';
import type { AlphaGenomeComponents, AlphaSignalBreakdown } from '../types';

export interface AlphaSignalsBadgeProps {
  readonly signals: AlphaGenomeComponents;
  readonly className?: string;
}

interface ChipSpec {
  readonly labelKey: string;
  readonly rawValue: number | null;
  readonly breakdown: AlphaSignalBreakdown | null;
  readonly suffix?: string;
}

function toInt(v: number | null | undefined): number | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  return Math.round(v);
}

export function AlphaSignalsBadge({ signals, className }: AlphaSignalsBadgeProps) {
  const t = useTranslations('TrendGenome');

  const chefCount = toInt(signals.instagram_heat?.raw_value ?? null);
  const galleryCount = toInt(signals.denue_alpha?.raw_value ?? null);
  const creatorCount = toInt(signals.instagram_heat?.normalized_0_100 ?? null);
  const specialtyCafeCount = toInt(signals.denue_alpha?.normalized_0_100 ?? null);
  const alphaOpenings = signals.denue_alpha;
  const migrationDecile = signals.migration_inflow_decile;
  const pulseScore = toInt(signals.pulse_score ?? null);

  const chips: readonly ChipSpec[] = [
    {
      labelKey: 'signals.chef',
      rawValue: chefCount,
      breakdown: signals.instagram_heat ?? null,
    },
    {
      labelKey: 'signals.gallery',
      rawValue: galleryCount,
      breakdown: signals.denue_alpha ?? null,
    },
    {
      labelKey: 'signals.creator',
      rawValue: creatorCount,
      breakdown: signals.instagram_heat ?? null,
    },
    {
      labelKey: 'signals.specialty_cafe',
      rawValue: specialtyCafeCount,
      breakdown: signals.denue_alpha ?? null,
    },
    {
      labelKey: 'signals.alpha_openings',
      rawValue: alphaOpenings ? toInt(alphaOpenings.raw_value ?? null) : null,
      breakdown: signals.denue_alpha ?? null,
    },
    {
      labelKey: 'signals.migration_decile',
      rawValue: migrationDecile,
      breakdown: signals.migration_inflow ?? null,
    },
    {
      labelKey: 'signals.pulse_score',
      rawValue: pulseScore,
      breakdown: null,
    },
  ];

  const visible = chips.filter((c) => c.rawValue !== null);

  if (visible.length === 0) {
    return null;
  }

  const containerClass = className ?? '';

  return (
    <ul className={`flex flex-wrap gap-1.5 ${containerClass}`} aria-label={t('aria.list')}>
      {visible.map((chip) => {
        const contribution = chip.breakdown?.contribution_pct;
        const contribStr =
          typeof contribution === 'number' && Number.isFinite(contribution)
            ? `${Math.round(contribution)}%`
            : null;
        return (
          <li
            key={chip.labelKey}
            className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-sunken)] px-2 py-0.5 text-xs text-[color:var(--color-text-secondary)]"
          >
            <span className="font-medium text-[color:var(--color-text-primary)]">
              {t(chip.labelKey)}
            </span>
            <span className="tabular-nums">{chip.rawValue}</span>
            {contribStr !== null ? (
              <span
                className="text-[10px] text-[color:var(--color-text-muted,var(--color-text-secondary))]"
                title={t('signals.contribution_label')}
              >
                · {contribStr}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
