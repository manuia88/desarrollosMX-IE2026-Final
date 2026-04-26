import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export interface BusquedasSkeletonProps {
  count?: number;
}

export function BusquedasSkeleton({ count = 9 }: BusquedasSkeletonProps) {
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '18px',
    padding: '16px 28px 80px',
  };
  return (
    <div style={gridStyle} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => `busquedas-skeleton-${i}`).map((id) => (
        <SkeletonCard key={id} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  const lineStyle = (w: string): CSSProperties => ({
    height: 12,
    width: w,
    background: 'var(--canon-border-2)',
    borderRadius: 6,
  });
  return (
    <Card variant="default" style={{ overflow: 'hidden', padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={lineStyle('60%')} />
        <div style={lineStyle('45%')} />
        <div style={lineStyle('80%')} />
        <div style={lineStyle('30%')} />
      </div>
    </Card>
  );
}
