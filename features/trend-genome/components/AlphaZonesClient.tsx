'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { cn } from '@/shared/ui/primitives/cn';
import { useAlphaCount, useAlphaZones } from '../hooks/useAlphaZones';
import { AlphaZoneCard } from './AlphaZoneCard';

export interface AlphaZonesClientProps {
  readonly locale: string;
  readonly country?: string;
  readonly className?: string;
}

const DEFAULT_COUNTRY = 'MX';

interface TrpcLikeError {
  readonly data?: { readonly code?: string };
  readonly message?: string;
}

function isForbidden(error: unknown): boolean {
  if (error === null || error === undefined) return false;
  const e = error as TrpcLikeError;
  if (e.data?.code === 'FORBIDDEN') return true;
  if (typeof e.message === 'string' && /pro_tier_required|FORBIDDEN/i.test(e.message)) {
    return true;
  }
  return false;
}

export function AlphaZonesClient({ country, className }: AlphaZonesClientProps) {
  const t = useTranslations('TrendGenome');
  const resolvedCountry = country ?? DEFAULT_COUNTRY;

  const countQuery = useAlphaCount({ country: resolvedCountry });
  const zonesQuery = useAlphaZones({ country: resolvedCountry });

  const teaserCount = countQuery.data?.total_alpha_zones ?? 0;

  const forbiddenTeaser = useMemo(() => isForbidden(zonesQuery.error), [zonesQuery.error]);

  return (
    <div className={cn('space-y-6', className)}>
      <section
        aria-label={t('teaser.count', { count: teaserCount })}
        className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-5"
      >
        <p className="text-sm text-[color:var(--color-text-secondary)]">
          {t('teaser.count', { count: teaserCount })}
        </p>
      </section>

      {zonesQuery.isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
        >
          {t('page.loading')}
        </div>
      ) : forbiddenTeaser ? (
        <section
          aria-label={t('cta.upgrade_pro', { count: teaserCount })}
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-6 text-center"
        >
          <p className="text-base text-[color:var(--color-text-primary)]">
            {t('cta.upgrade_pro', { count: teaserCount })}
          </p>
        </section>
      ) : zonesQuery.error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
        >
          {t('page.error')}
        </div>
      ) : zonesQuery.data && zonesQuery.data.length > 0 ? (
        <ul aria-label={t('aria.list')} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zonesQuery.data.map((zone) => (
            <li key={`${zone.scope_type}:${zone.zone_id}`}>
              <AlphaZoneCard zone={zone} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          role="status"
          className="rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] p-8 text-center text-[color:var(--color-text-secondary)]"
        >
          {t('page.empty')}
        </div>
      )}
    </div>
  );
}
