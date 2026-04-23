'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { formatCurrency } from '@/shared/lib/i18n/formatters';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import type { MockClientProfile } from '../../types';

export interface ProfileTabsProps {
  readonly profiles: readonly MockClientProfile[];
}

const PRIORITY_TO_KEY: Readonly<Record<MockClientProfile['priority'], string>> = {
  schools: 'priority_schools',
  commute: 'priority_commute',
  lifestyle: 'priority_lifestyle',
};

export function ProfileTabs({ profiles }: ProfileTabsProps) {
  const t = useTranslations('PreviewAsesor');
  const locale = useLocale();
  const [activeId, setActiveId] = useState<string>(profiles[0]?.id ?? '');

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? profiles[0],
    [profiles, activeId],
  );

  if (!active) return null;

  const priorityKey = PRIORITY_TO_KEY[active.priority];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5, 1.25rem)' }}>
      <div
        role="tablist"
        aria-label={t('flow.profiles.title')}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2, 0.5rem)',
        }}
      >
        {profiles.map((p, i) => {
          const isActive = p.id === active.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`profile-panel-${p.id}`}
              id={`profile-tab-${p.id}`}
              onClick={() => setActiveId(p.id)}
              style={{
                padding: 'var(--space-2, 0.5rem) var(--space-4, 1rem)',
                borderRadius: 'var(--radius-md, 0.5rem)',
                border: `1px solid ${isActive ? 'var(--color-accent-border)' : 'var(--color-border-subtle)'}`,
                background: isActive ? 'var(--color-accent-soft)' : 'var(--color-surface-elevated)',
                color: isActive ? 'var(--color-accent-strong)' : 'var(--color-text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive
                  ? 'var(--font-weight-semibold, 600)'
                  : 'var(--font-weight-medium, 500)',
                cursor: 'pointer',
              }}
            >
              {t('flow.profiles.tab_label', { index: i + 1 })} · {t(p.nameKey)}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`profile-panel-${active.id}`}
        aria-labelledby={`profile-tab-${active.id}`}
        style={{
          padding: 'var(--space-5, 1.25rem)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          border: '1px solid var(--color-border-subtle)',
          background: 'var(--color-surface-elevated)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4, 1rem)',
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2, 0.5rem)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-xl, 1.25rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t(active.nameKey)}
          </h3>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-3, 0.75rem)',
              margin: 0,
            }}
          >
            <DetailItem term={t('flow.profiles.age_label')} value={active.ageRange} />
            <DetailItem term={t('flow.profiles.family_label')} value={t(active.family)} />
            <DetailItem
              term={t('flow.profiles.budget_label')}
              value={formatCurrency(active.budgetMxn, 'MXN', locale, { maximumFractionDigits: 0 })}
            />
            <DetailItem
              term={t('flow.profiles.priority_label')}
              value={t(`flow.profiles.${priorityKey}`)}
            />
          </dl>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3, 0.75rem)' }}>
          <h4
            style={{
              margin: 0,
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('flow.proposal.title')}
          </h4>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            {t('flow.proposal.description')}
          </p>

          <ol
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3, 0.75rem)',
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {active.proposedZones.map((zone, idx) => {
              const fit = Math.max(0, Math.min(100, zone.fitPct));
              const label = resolveZoneLabelSync({ scopeType: 'colonia', scopeId: zone.scopeId });
              return (
                <li
                  key={zone.scopeId}
                  style={{
                    padding: 'var(--space-4, 1rem)',
                    borderRadius: 'var(--radius-md, 0.5rem)',
                    border: '1px solid var(--color-border-subtle)',
                    background: 'var(--color-surface-raised)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2, 0.5rem)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 'var(--space-2, 0.5rem)',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-semibold, 600)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {idx + 1}. {label}
                    </span>
                    <span
                      style={{
                        padding: 'var(--space-1, 0.25rem) var(--space-3, 0.75rem)',
                        borderRadius: 'var(--radius-full, 999px)',
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent-strong)',
                        fontSize: 'var(--text-xs, 0.75rem)',
                        fontWeight: 'var(--font-weight-semibold, 600)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {t('flow.proposal.fit_label', { pct: zone.fitPct })}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={zone.fitPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('flow.proposal.fit_label', { pct: zone.fitPct })}
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 'var(--radius-full, 999px)',
                      background: 'var(--color-surface-elevated)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${fit}%`,
                        height: '100%',
                        background: 'var(--color-accent-strong)',
                      }}
                    />
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 'var(--font-weight-semibold, 600)',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {t('flow.proposal.rationale_label')}:
                    </span>{' '}
                    {t(zone.rationaleKey)}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

interface DetailItemProps {
  readonly term: string;
  readonly value: string;
}

function DetailItem({ term, value }: DetailItemProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1, 0.25rem)' }}>
      <dt
        style={{
          fontSize: 'var(--text-xs, 0.75rem)',
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {term}
      </dt>
      <dd
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
          fontWeight: 'var(--font-weight-medium, 500)',
        }}
      >
        {value}
      </dd>
    </div>
  );
}
