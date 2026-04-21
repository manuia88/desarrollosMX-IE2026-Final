import { useTranslations } from 'next-intl';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import type { MockNarvarteData } from '../../types';

export interface MigrationDiagramProps {
  readonly points: MockNarvarteData['migrationPoints'];
  readonly destScopeId: string;
}

export function MigrationDiagram({ points, destScopeId }: MigrationDiagramProps) {
  const t = useTranslations('PreviewDeveloper.flow.migration');

  const destLabel = resolveZoneLabelSync({ scopeType: 'colonia', scopeId: destScopeId });

  // Layout: origins as a vertical stack on the left, dest as a single node on the right.
  const width = 520;
  const heightPerOrigin = 56;
  const margin = 24;
  const height = Math.max(160, points.length * heightPerOrigin + margin * 2);
  const destX = width - 140;
  const destY = height / 2;
  const originX = 110;

  // Volume → stroke width (3..10).
  const volumes = points.map((p) => p.volume);
  const maxVol = volumes.length > 0 ? Math.max(...volumes) : 1;
  const minVol = volumes.length > 0 ? Math.min(...volumes) : 0;

  function strokeFor(volume: number): number {
    if (maxVol === minVol) return 5;
    const t = (volume - minVol) / (maxVol - minVol);
    return 3 + t * 7;
  }

  return (
    <div
      style={{
        padding: 'var(--space-4, 1rem)',
        borderRadius: 'var(--radius-lg, 0.75rem)',
        border: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface-elevated)',
        overflowX: 'auto',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={t('title')}
        role="img"
      >
        <title>{t('title')}</title>

        <defs>
          <marker
            id="migration-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent-strong, #6366f1)" />
          </marker>
        </defs>

        {points.map((point, idx) => {
          const originY = margin + idx * heightPerOrigin + heightPerOrigin / 2;
          const originLabel = resolveZoneLabelSync({
            scopeType: 'colonia',
            scopeId: point.origin_scope_id,
          });
          const sw = strokeFor(point.volume);
          return (
            <g key={point.origin_scope_id}>
              <line
                x1={originX + 6}
                y1={originY}
                x2={destX - 6}
                y2={destY}
                stroke="var(--color-accent-strong, #6366f1)"
                strokeOpacity={0.65}
                strokeWidth={sw}
                strokeLinecap="round"
                markerEnd="url(#migration-arrow)"
              />
              <circle cx={originX} cy={originY} r={6} fill="var(--color-accent-strong, #6366f1)" />
              <text
                x={originX - 12}
                y={originY + 4}
                textAnchor="end"
                style={{
                  fontSize: 12,
                  fill: 'var(--color-text-primary)',
                  fontWeight: 500,
                }}
              >
                {originLabel}
              </text>
              <text
                x={(originX + destX) / 2}
                y={(originY + destY) / 2 - 6}
                textAnchor="middle"
                style={{
                  fontSize: 10,
                  fill: 'var(--color-text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {point.volume}
              </text>
            </g>
          );
        })}

        <circle
          cx={destX}
          cy={destY}
          r={14}
          fill="var(--color-accent-soft, #eef2ff)"
          stroke="var(--color-accent-strong, #6366f1)"
          strokeWidth={2}
        />
        <text
          x={destX + 22}
          y={destY + 4}
          style={{
            fontSize: 13,
            fill: 'var(--color-text-primary)',
            fontWeight: 600,
          }}
        >
          {destLabel}
        </text>
        <text
          x={originX - 12}
          y={margin / 2 + 4}
          textAnchor="end"
          style={{
            fontSize: 10,
            fill: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('origin')}
        </text>
        <text
          x={destX + 22}
          y={margin / 2 + 4}
          style={{
            fontSize: 10,
            fill: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('dest')}
        </text>
      </svg>
    </div>
  );
}
