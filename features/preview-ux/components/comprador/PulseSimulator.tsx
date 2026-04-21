import { useTranslations } from 'next-intl';
import type { MockCausalDriver, MockPulseSummary } from '../../types';

export interface PulseSimulatorProps {
  readonly pulse: MockPulseSummary;
  readonly drivers: readonly MockCausalDriver[];
  readonly conclusionKey: string;
}

export function PulseSimulator({ pulse, drivers, conclusionKey }: PulseSimulatorProps) {
  const t = useTranslations('PreviewComprador.flow.pulse');
  const tShared = useTranslations('PreviewShared');

  const vitals: ReadonlyArray<{
    readonly id: string;
    readonly value: number;
    readonly labelKey: string;
  }> = [
    { id: 'appreciation', value: pulse.vitals.appreciation, labelKey: 'vital_appreciation' },
    { id: 'liquidity', value: pulse.vitals.liquidity, labelKey: 'vital_liquidity' },
    { id: 'demand', value: pulse.vitals.demand, labelKey: 'vital_demand' },
    { id: 'momentum', value: pulse.vitals.momentum, labelKey: 'vital_momentum' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--space-5, 1.25rem)',
      }}
    >
      <div
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
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('heartbeat_label')}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '3rem',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: 'var(--color-accent-strong)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {pulse.heartbeat}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-primary)',
          }}
        >
          {tShared(`narvarte.pulse.headline` as const)}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3, 0.75rem)' }}>
          {vitals.map((vital) => {
            const widthPct = Math.max(0, Math.min(100, vital.value));
            return (
              <div key={vital.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-1, 0.25rem)',
                  }}
                >
                  <span>{t(vital.labelKey)}</span>
                  <span
                    style={{
                      color: 'var(--color-text-primary)',
                      fontWeight: 'var(--font-weight-semibold, 600)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {vital.value}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={vital.value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(vital.labelKey)}
                  style={{
                    width: '100%',
                    height: 8,
                    borderRadius: 'var(--radius-full, 999px)',
                    background: 'var(--color-surface-raised)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: '100%',
                      background: 'var(--color-accent-strong)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
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
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('drivers_heading')}
        </p>

        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3, 0.75rem)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {drivers.map((driver) => {
            const positive = driver.direction === 'positive';
            const color = positive
              ? 'var(--color-success-strong, #16a34a)'
              : 'var(--color-danger-strong, #dc2626)';
            const magnitude = Math.max(0, Math.min(100, driver.impact_pct));
            return (
              <li
                key={driver.factor}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1, 0.25rem)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--color-text-primary)',
                      fontWeight: 'var(--font-weight-medium, 500)',
                    }}
                  >
                    {tShared(driver.factor)}
                  </span>
                  <span
                    style={{
                      color,
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 'var(--font-weight-semibold, 600)',
                    }}
                  >
                    {t('impact_label', { pct: positive ? driver.impact_pct : -driver.impact_pct })}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 'var(--radius-full, 999px)',
                    background: 'var(--color-surface-raised)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${magnitude}%`, height: '100%', background: color }} />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-xs, 0.75rem)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <span style={{ fontWeight: 'var(--font-weight-semibold, 600)' }}>
                    {t('evidence_label')}:
                  </span>{' '}
                  {tShared(driver.evidence)}
                </p>
              </li>
            );
          })}
        </ul>

        <div
          style={{
            padding: 'var(--space-3, 0.75rem)',
            borderRadius: 'var(--radius-md, 0.5rem)',
            background: 'var(--color-accent-soft)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--color-accent-strong)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 'var(--font-weight-semibold, 600)',
              marginBottom: 'var(--space-1, 0.25rem)',
            }}
          >
            {t('conclusion_heading')}
          </p>
          <p style={{ margin: 0 }}>{tShared(conclusionKey)}</p>
        </div>
      </div>
    </div>
  );
}
