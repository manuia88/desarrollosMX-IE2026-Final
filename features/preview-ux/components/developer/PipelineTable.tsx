import { useTranslations } from 'next-intl';
import type { MockFeasibility } from '../../types';

export interface PipelineTableProps {
  readonly projects: MockFeasibility['pipelineProjects'];
}

const STATUS_TONE: Readonly<Record<'announced' | 'in_progress' | 'presale', string>> = {
  announced: 'var(--color-accent-soft, #eef2ff)',
  in_progress: 'var(--color-warm-soft, #fef3c7)',
  presale: 'var(--color-cool-soft, #cffafe)',
};

export function PipelineTable({ projects }: PipelineTableProps) {
  const t = useTranslations('PreviewDeveloper.flow.pipeline');
  const tStatus = useTranslations('PreviewDeveloper.flow.pipeline.status');
  const tProjects = useTranslations('PreviewDeveloper.flow.pipeline.projects');

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
        }}
      >
        <thead>
          <tr style={{ background: 'var(--color-surface-sunken, #f8fafc)' }}>
            <th
              scope="col"
              style={{
                textAlign: 'left',
                padding: 'var(--space-3, 0.75rem)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                fontSize: 'var(--text-xs, 0.75rem)',
                letterSpacing: '0.08em',
              }}
            >
              {t('columns.name')}
            </th>
            <th
              scope="col"
              style={{
                textAlign: 'right',
                padding: 'var(--space-3, 0.75rem)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                fontSize: 'var(--text-xs, 0.75rem)',
                letterSpacing: '0.08em',
              }}
            >
              {t('columns.units')}
            </th>
            <th
              scope="col"
              style={{
                textAlign: 'left',
                padding: 'var(--space-3, 0.75rem)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                fontSize: 'var(--text-xs, 0.75rem)',
                letterSpacing: '0.08em',
              }}
            >
              {t('columns.status')}
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            // p.nameKey shape: 'feasibility.project_xxx' — extract the leaf key.
            const leaf = p.nameKey.split('.').slice(-1)[0] ?? p.nameKey;
            return (
              <tr key={p.id} style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <td
                  style={{
                    padding: 'var(--space-3, 0.75rem)',
                    color: 'var(--color-text-primary)',
                    fontWeight: 'var(--font-weight-medium, 500)',
                  }}
                >
                  {tProjects(leaf)}
                </td>
                <td
                  style={{
                    padding: 'var(--space-3, 0.75rem)',
                    color: 'var(--color-text-primary)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {p.unitCount}
                </td>
                <td style={{ padding: 'var(--space-3, 0.75rem)' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: 'var(--space-1, 0.25rem) var(--space-3, 0.75rem)',
                      borderRadius: 'var(--radius-full, 999px)',
                      background: STATUS_TONE[p.status],
                      color: 'var(--color-text-primary)',
                      fontSize: 'var(--text-xs, 0.75rem)',
                      fontWeight: 'var(--font-weight-semibold, 600)',
                    }}
                  >
                    {tStatus(p.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
