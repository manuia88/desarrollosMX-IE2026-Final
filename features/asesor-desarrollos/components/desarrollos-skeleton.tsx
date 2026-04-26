import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export interface DesarrollosSkeletonProps {
  count?: number;
}

export function DesarrollosSkeleton({ count = 12 }: DesarrollosSkeletonProps) {
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '18px',
    padding: '16px 28px 80px',
  };
  return (
    <div style={gridStyle} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => `desarrollos-skeleton-${i}`).map((id) => (
        <SkeletonCard key={id} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  const photoStyle: CSSProperties = {
    width: '100%',
    aspectRatio: '16 / 10',
    background: 'var(--canon-bg-2)',
    borderRadius: 'var(--canon-radius-card) var(--canon-radius-card) 0 0',
  };
  const lineStyle = (w: string): CSSProperties => ({
    height: 12,
    width: w,
    background: 'var(--canon-border-2)',
    borderRadius: 6,
  });
  return (
    <Card variant="default" style={{ overflow: 'hidden' }}>
      <div style={photoStyle} />
      <div
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={lineStyle('70%')} />
        <div style={lineStyle('45%')} />
        <div style={lineStyle('60%')} />
      </div>
    </Card>
  );
}
