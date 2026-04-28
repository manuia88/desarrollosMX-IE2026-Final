// F14.F.8 Sprint 7 BIBLIA Upgrade 8 — Zone heatmap interactivo (public gallery).

import type { CSSProperties } from 'react';
import { renderHeatmapSvg } from '@/features/dmx-studio/lib/zone-videos/heatmap-generator';

export interface ZoneHeatmapData {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly scores: {
    pulse: number | null;
    futures: number | null;
    ghost: number | null;
    alpha: number | null;
    capturedAt: string;
  };
}

interface Props {
  readonly zones: ReadonlyArray<ZoneHeatmapData>;
  readonly onZoneClick?: (zoneId: string) => void;
}

const containerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px',
  padding: '20px',
};

const cardStyle: CSSProperties = {
  padding: '16px',
  borderRadius: 'var(--canon-radius-card)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  cursor: 'pointer',
};

export function ZoneHeatmapInteractive({ zones, onZoneClick }: Props) {
  if (zones.length === 0) {
    return (
      <div style={{ padding: '24px', color: 'rgba(255,255,255,0.6)' }}>
        Sin zonas para visualizar.
      </div>
    );
  }
  return (
    <section aria-label="Heatmap zonas" style={containerStyle}>
      {zones.map((z) => (
        <button
          type="button"
          key={z.zoneId}
          style={{ ...cardStyle, textAlign: 'left', font: 'inherit', color: 'inherit' }}
          onClick={() => onZoneClick?.(z.zoneId)}
          aria-label={`Ver detalles de ${z.zoneName}`}
        >
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '16px',
              color: 'var(--canon-cream)',
            }}
          >
            {z.zoneName}
          </h3>
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated server-side desde scores controlados
            dangerouslySetInnerHTML={{ __html: renderHeatmapSvg(z.scores) }}
          />
        </button>
      ))}
    </section>
  );
}
