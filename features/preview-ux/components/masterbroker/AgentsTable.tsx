import { useLocale, useTranslations } from 'next-intl';
import { formatCurrency, formatNumber } from '@/shared/lib/i18n/formatters';
import { LabelPill, type LabelPillTone } from '@/shared/ui/dopamine/label-pill';
import type { MockAgent } from '../../types';

const BADGE_TONE: Readonly<Record<MockAgent['badges'][number], LabelPillTone>> = {
  top_closer: 'sunset',
  streak_week: 'primary',
  alpha_hunter: 'cool',
  rising_star: 'fresh',
};

export interface AgentsTableProps {
  readonly agents: readonly MockAgent[];
}

export function AgentsTable({ agents }: AgentsTableProps) {
  const t = useTranslations('PreviewMasterBroker.flow.agents');
  const tBadges = useTranslations('PreviewMasterBroker.flow.agents.badges');
  const locale = useLocale();

  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg, 0.75rem)',
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface-elevated)',
        overflowX: 'auto',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--text-sm)',
          minWidth: 760,
        }}
      >
        <thead>
          <tr style={{ background: 'var(--color-surface-sunken, #f8fafc)' }}>
            {(
              ['name', 'zone', 'pipeline', 'conversion', 'ytd', 'weekly_deals', 'trend'] as const
            ).map((col, idx) => (
              <th
                key={col}
                scope="col"
                style={{
                  textAlign: idx >= 2 && col !== 'zone' ? 'right' : 'left',
                  padding: 'var(--space-3, 0.75rem)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: 'var(--color-text-secondary)',
                  textTransform: 'uppercase',
                  fontSize: 'var(--text-xs, 0.75rem)',
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                }}
              >
                {t(`columns.${col}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => {
            const trendUp = a.trendPct >= 0;
            return (
              <tr key={a.id} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <td style={{ padding: 'var(--space-3, 0.75rem)' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-3, 0.75rem)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--color-accent-soft)',
                        color: 'var(--color-accent-strong)',
                        fontSize: 'var(--text-xs, 0.75rem)',
                        fontWeight: 'var(--font-weight-bold, 700)',
                      }}
                    >
                      {a.initials}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          color: 'var(--color-text-primary)',
                          fontWeight: 'var(--font-weight-semibold, 600)',
                        }}
                      >
                        {a.name}
                      </span>
                      <div
                        style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}
                      >
                        {a.badges.map((b) => (
                          <LabelPill key={b} tone={BADGE_TONE[b]} size="sm">
                            {tBadges(b)}
                          </LabelPill>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  style={{
                    padding: 'var(--space-3, 0.75rem)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {a.zoneLabel}
                </td>
                <td
                  style={{
                    padding: 'var(--space-3, 0.75rem)',
                    color: 'var(--color-text-primary)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(a.pipelineMxn, 'MXN', locale, { maximumFractionDigits: 0 })}
                </td>
                <td
                  style={{
                    padding: 'var(--space-3, 0.75rem)',
                    color: 'var(--color-text-primary)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatNumber(a.conversionPct, locale, { maximumFractionDigits: 1 })}%
                </td>
                <td
                  style={{
                    padding: 'var(--space-3, 0.75rem)',
                    color: 'var(--color-text-primary)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCurrency(a.ytdRevenueMxn, 'MXN', locale, { maximumFractionDigits: 0 })}
                </td>
                <td
                  style={{
                    padding: 'var(--space-3, 0.75rem)',
                    color: 'var(--color-text-primary)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {a.weeklyDeals}
                </td>
                <td
                  style={{
                    padding: 'var(--space-3, 0.75rem)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: trendUp
                      ? 'var(--color-success, #16a34a)'
                      : 'var(--color-danger, #dc2626)',
                    fontWeight: 'var(--font-weight-semibold, 600)',
                  }}
                >
                  <span aria-hidden="true">{trendUp ? '▲' : '▼'}</span>{' '}
                  {formatNumber(Math.abs(a.trendPct), locale, { maximumFractionDigits: 1 })}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
