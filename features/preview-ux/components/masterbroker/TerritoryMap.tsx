import { useTranslations } from 'next-intl';
import type { MockAgent } from '../../types';

export interface TerritoryMapProps {
  readonly agents: readonly MockAgent[];
}

const PALETTE: readonly string[] = [
  'var(--color-accent-soft, #eef2ff)',
  'var(--color-warm-soft, #fef3c7)',
  'var(--color-cool-soft, #cffafe)',
  'var(--color-fresh-soft, #d1fae5)',
  'var(--color-sunset-soft, #ffedd5)',
];

export function TerritoryMap({ agents }: TerritoryMapProps) {
  const t = useTranslations('PreviewMasterBroker.flow.territory');

  // Layout: 5 cols × 2 rows hex-ish grid (rectangles for simplicity).
  const cols = 5;
  const rows = Math.ceil(agents.length / cols);
  const cellW = 130;
  const cellH = 96;
  const gap = 8;
  const width = cols * (cellW + gap) - gap;
  const height = rows * (cellH + gap) - gap;

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
        role="img"
        aria-label={t('title')}
      >
        <title>{t('title')}</title>
        {agents.map((agent, idx) => {
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const x = col * (cellW + gap);
          const y = row * (cellH + gap);
          const fill = PALETTE[idx % PALETTE.length] ?? PALETTE[0] ?? '#eef2ff';
          return (
            <g key={agent.id}>
              <rect
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                rx={10}
                fill={fill}
                stroke="var(--color-border-subtle, #e5e7eb)"
                strokeWidth={1}
              />
              <text
                x={x + cellW / 2}
                y={y + cellH / 2 - 6}
                textAnchor="middle"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fill: 'var(--color-text-primary)',
                }}
              >
                {agent.initials}
              </text>
              <text
                x={x + cellW / 2}
                y={y + cellH / 2 + 18}
                textAnchor="middle"
                style={{
                  fontSize: 11,
                  fill: 'var(--color-text-secondary)',
                }}
              >
                {agent.zoneLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
