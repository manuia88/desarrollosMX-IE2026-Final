'use client';

import { useTranslations } from 'next-intl';
import { trpc } from '@/shared/lib/trpc/client';
import type { IndexCode } from '../lib/index-registry-helpers';
import {
  isActiveMethodology,
  type MethodologyRow,
  parseWeightsJsonb,
  resolveActiveMethodology,
} from '../lib/methodology-helpers';
import { IndexBadge } from './IndexBadge';
import { WeightsBarChart } from './WeightsBarChart';

export interface MethodologyDetailClientProps {
  readonly indexCode: IndexCode;
  readonly today?: string;
}

const STALE_TIME_1H = 60 * 60 * 1000;

export function MethodologyDetailClient({ indexCode, today }: MethodologyDetailClientProps) {
  const t = useTranslations('IndicesPublic');
  const query = trpc.indicesPublic.getMethodology.useQuery(
    { indexCode },
    { staleTime: STALE_TIME_1H },
  );

  const resolvedToday = today ?? new Date().toISOString().slice(0, 10);

  if (query.isLoading) {
    return (
      <output
        aria-busy="true"
        aria-label={t('page.loading')}
        style={{ display: 'block', minHeight: 240, padding: 'var(--space-6, 1.5rem)' }}
      />
    );
  }

  const versions = (query.data ?? []) as ReadonlyArray<MethodologyRow>;
  if (versions.length === 0) {
    return (
      <p
        style={{
          padding: 'var(--space-6, 1.5rem)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--text-base)',
        }}
      >
        {t('methodology.no_methodology')}
      </p>
    );
  }

  const active = resolveActiveMethodology(versions, resolvedToday);
  const activeRow = active ?? versions[0];
  if (!activeRow) {
    return <p style={{ padding: 'var(--space-6, 1.5rem)' }}>{t('methodology.no_methodology')}</p>;
  }

  const weights = parseWeightsJsonb(activeRow.weights_jsonb);
  const isActive = isActiveMethodology(activeRow, resolvedToday);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-8, 2rem)',
      }}
    >
      <section
        aria-label={t('methodology.version_label', { version: activeRow.version })}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-4, 1rem)',
        }}
      >
        <IndexBadge code={indexCode} size="lg" showName />
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {t('methodology.version_label', { version: activeRow.version })}
        </span>
        <span
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-tertiary, var(--color-text-secondary))',
          }}
        >
          {t('methodology.effective_from', { date: activeRow.effective_from })}
        </span>
        {isActive ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 10px',
              borderRadius: 'var(--radius-pill, 9999px)',
              background: 'var(--gradient-fresh, var(--color-accent-primary))',
              color: 'var(--color-text-inverse, white)',
              fontSize: 'var(--text-xs, 12px)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
          >
            {t('methodology.active')}
          </span>
        ) : activeRow.effective_to ? (
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
            {t('methodology.effective_to', { date: activeRow.effective_to })}
          </span>
        ) : null}

        <a
          href={`/api/metodologia/${indexCode}/pdf`}
          aria-label={t('methodology.download_pdf')}
          download={`dmx-metodologia-${indexCode}.pdf`}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
            background: 'var(--color-surface-raised, white)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium, 500)',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          {t('methodology.download_pdf')}
        </a>
      </section>

      <section aria-label={t('methodology.weights_title')}>
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            margin: '0 0 var(--space-4, 1rem)',
          }}
        >
          {t('methodology.weights_title')}
        </h2>
        {weights.length > 0 ? (
          <WeightsBarChart entries={weights} ariaLabel={t('methodology.weights_title')} />
        ) : (
          <p style={{ color: 'var(--color-text-secondary)' }}>{t('methodology.no_methodology')}</p>
        )}
      </section>

      <section aria-label={t('methodology.formula_title')}>
        <h2
          style={{
            fontSize: 'var(--text-xl)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            margin: '0 0 var(--space-4, 1rem)',
          }}
        >
          {t('methodology.formula_title')}
        </h2>
        <pre
          style={{
            padding: 'var(--space-4, 1rem)',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--color-surface-muted, rgba(0,0,0,0.04))',
            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
            overflowX: 'auto',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            color: 'var(--color-text-primary)',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {activeRow.formula_md}
        </pre>
      </section>

      {versions.length > 1 ? (
        <section aria-label={t('methodology.changelog_title')}>
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              margin: '0 0 var(--space-4, 1rem)',
            }}
          >
            {t('methodology.changelog_title')}
          </h2>
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4, 1rem)',
            }}
          >
            {versions.map((v) => (
              <li
                key={`${v.index_code}-${v.version}`}
                style={{
                  padding: 'var(--space-4, 1rem)',
                  borderLeft: '2px solid var(--color-accent-primary, var(--color-border-subtle))',
                  background: 'var(--color-surface-muted, rgba(0,0,0,0.03))',
                  borderRadius: 'var(--radius-sm, 4px)',
                }}
              >
                <header
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3, 0.75rem)',
                    alignItems: 'baseline',
                    marginBottom: 6,
                  }}
                >
                  <strong style={{ fontSize: 'var(--text-sm)' }}>
                    {t('methodology.version_label', { version: v.version })}
                  </strong>
                  <span
                    style={{
                      fontSize: 'var(--text-xs, 12px)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {t('methodology.effective_from', { date: v.effective_from })}
                  </span>
                  {v.effective_to ? (
                    <span
                      style={{
                        fontSize: 'var(--text-xs, 12px)',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {t('methodology.effective_to', { date: v.effective_to })}
                    </span>
                  ) : null}
                </header>
                {v.changelog_notes ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {v.changelog_notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
