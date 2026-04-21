import { useTranslations } from 'next-intl';
import { IndexBadge } from '@/features/indices-publicos/components/IndexBadge';
import type { MockIndexScore } from '../../types';

export interface ScoresGridProps {
  readonly scores: readonly MockIndexScore[];
}

export function ScoresGrid({ scores }: ScoresGridProps) {
  const t = useTranslations('PreviewComprador.flow.highlight');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 'var(--space-3, 0.75rem)',
      }}
    >
      {scores.map((score) => (
        <div
          key={score.code}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2, 0.5rem)',
            padding: 'var(--space-3, 0.75rem)',
            borderRadius: 'var(--radius-md, 0.5rem)',
            border: '1px solid var(--color-border-subtle)',
            background: 'var(--color-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <IndexBadge code={score.code} size="sm" />
            <span
              style={{
                fontSize: 'var(--text-xl, 1.25rem)',
                fontWeight: 'var(--font-weight-bold, 700)',
                color: 'var(--color-text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {score.value}
            </span>
          </div>
          <span
            style={{
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {t('percentile_label', { n: score.percentile })}
          </span>
        </div>
      ))}
    </div>
  );
}
