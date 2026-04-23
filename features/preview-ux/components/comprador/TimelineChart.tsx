import { useTranslations } from 'next-intl';
import type { MockTimelinePoint } from '../../types';

export interface TimelineChartProps {
  readonly points: readonly MockTimelinePoint[];
}

type SeriesKey = 'ipv' | 'liv' | 'fam' | 'yng';

interface SeriesMeta {
  readonly key: SeriesKey;
  readonly labelKey: string;
  readonly color: string;
}

const SERIES: readonly SeriesMeta[] = [
  { key: 'ipv', labelKey: 'series_ipv', color: 'var(--color-accent-strong)' },
  { key: 'liv', labelKey: 'series_liv', color: 'var(--color-chart-2, #0ea5a4)' },
  { key: 'fam', labelKey: 'series_fam', color: 'var(--color-chart-3, #f97316)' },
  { key: 'yng', labelKey: 'series_yng', color: 'var(--color-chart-4, #8b5cf6)' },
];

const WIDTH = 720;
const HEIGHT = 280;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 16;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 40;

export function TimelineChart({ points }: TimelineChartProps) {
  const t = useTranslations('PreviewComprador.flow.timeline');
  const tShared = useTranslations('PreviewShared');

  if (points.length === 0) {
    return null;
  }

  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const allValues = points.flatMap((p) => [p.ipv, p.liv, p.fam, p.yng]);
  const minV = Math.max(0, Math.floor(Math.min(...allValues) / 10) * 10 - 5);
  const maxV = Math.min(100, Math.ceil(Math.max(...allValues) / 10) * 10 + 5);
  const range = Math.max(1, maxV - minV);

  const xAt = (i: number): number => {
    if (points.length === 1) return PADDING_LEFT + plotWidth / 2;
    return PADDING_LEFT + (i * plotWidth) / (points.length - 1);
  };
  const yAt = (value: number): number => {
    return PADDING_TOP + plotHeight - ((value - minV) * plotHeight) / range;
  };

  const pathFor = (key: SeriesKey): string => {
    return points
      .map((p, i) => {
        const x = xAt(i);
        const y = yAt(p[key]);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const yTicks: readonly number[] = [minV, minV + range / 2, maxV];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3, 0.75rem)' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3, 0.75rem)',
          fontSize: 'var(--text-xs, 0.75rem)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {SERIES.map((s) => (
          <span
            key={s.key}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1, 0.25rem)' }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: s.color,
              }}
            />
            {t(s.labelKey)}
          </span>
        ))}
      </div>

      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          background: 'var(--color-surface-elevated)',
          padding: 'var(--space-3, 0.75rem)',
        }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={t('axis_score')}
          style={{ width: '100%', height: 'auto', minWidth: 640 }}
        >
          <title>{t('axis_score')}</title>

          {yTicks.map((tick) => {
            const y = yAt(tick);
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={PADDING_LEFT}
                  x2={WIDTH - PADDING_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="var(--color-border-subtle)"
                  strokeDasharray="2 3"
                />
                <text
                  x={PADDING_LEFT - 6}
                  y={y + 4}
                  fontSize={10}
                  fill="var(--color-text-secondary)"
                  textAnchor="end"
                >
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          {points.map((p, i) => {
            if (i % 2 !== 0) return null;
            const x = xAt(i);
            return (
              <text
                key={`xlabel-${p.period}`}
                x={x}
                y={HEIGHT - PADDING_BOTTOM + 16}
                fontSize={10}
                fill="var(--color-text-secondary)"
                textAnchor="middle"
              >
                {p.period}
              </text>
            );
          })}

          <text x={PADDING_LEFT} y={HEIGHT - 8} fontSize={11} fill="var(--color-text-tertiary)">
            {t('axis_period')}
          </text>

          {SERIES.map((s) => (
            <path
              key={s.key}
              d={pathFor(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {points.map((p, i) => {
            if (!p.milestone) return null;
            const x = xAt(i);
            const y = yAt(Math.max(p.ipv, p.liv, p.fam, p.yng));
            return (
              <g key={`milestone-${p.period}`}>
                <circle
                  cx={x}
                  cy={y - 10}
                  r={5}
                  fill="var(--color-accent-strong)"
                  stroke="var(--color-surface-elevated)"
                  strokeWidth={2}
                >
                  <title>
                    {t('milestone_label')}: {tShared(p.milestone)}
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
