import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';
import { STATUS_KEYS } from '../lib/filter-schemas';

export interface CaptacionesSkeletonProps {
  columns?: number;
}

export function CaptacionesSkeleton({ columns = STATUS_KEYS.length }: CaptacionesSkeletonProps) {
  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(240px, 1fr))`,
    gap: 12,
    padding: '16px 28px 80px',
  };
  return (
    <div style={containerStyle} aria-busy="true" aria-live="polite">
      {Array.from({ length: columns }, (_, i) => `captaciones-col-skel-${i}`).map((id) => (
        <SkeletonColumn key={id} />
      ))}
    </div>
  );
}

function SkeletonColumn() {
  const lineStyle = (w: string): CSSProperties => ({
    height: 10,
    width: w,
    background: 'var(--canon-border-2)',
    borderRadius: 6,
  });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 12,
        borderRadius: 'var(--canon-radius-card)',
        border: '1px dashed var(--canon-border-2)',
        background: 'var(--canon-bg)',
      }}
    >
      <div style={lineStyle('60%')} />
      <Card variant="default" style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={lineStyle('70%')} />
          <div style={lineStyle('45%')} />
          <div style={lineStyle('55%')} />
        </div>
      </Card>
      <Card variant="default" style={{ padding: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={lineStyle('80%')} />
          <div style={lineStyle('40%')} />
        </div>
      </Card>
    </div>
  );
}
