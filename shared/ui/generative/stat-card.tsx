import type { z } from 'zod';
import type { statCardSpecSchema } from '@/features/ia-generativa/schemas/generative-spec';

type Props = Omit<z.infer<typeof statCardSpecSchema>, 'type'>;

export function StatCard({ label, value, trend, color }: Props) {
  const trendColor =
    trend === undefined ? undefined : trend >= 0 ? 'oklch(0.65 0.17 150)' : 'oklch(0.65 0.19 30)';

  return (
    <div className="gen-stat-card" style={color ? { borderColor: color } : undefined}>
      <div className="gen-stat-label">{label}</div>
      <div className="gen-stat-value">{value}</div>
      {trend !== undefined ? (
        <div className="gen-stat-trend" style={trendColor ? { color: trendColor } : undefined}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </div>
      ) : null}
    </div>
  );
}
