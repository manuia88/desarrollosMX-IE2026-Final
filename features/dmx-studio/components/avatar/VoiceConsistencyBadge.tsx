'use client';

// F14.F.8 Sprint 7 BIBLIA Upgrade 7 — Voice consistency badge.

import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export type VoiceMatchLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface VoiceConsistencyBadgeProps {
  readonly matchLevel: VoiceMatchLevel;
  readonly matchScore: number;
  readonly recommendations: ReadonlyArray<string>;
}

const COLORS: Record<VoiceMatchLevel, { bg: string; fg: string; label: string }> = {
  high: { bg: 'rgba(34,197,94,0.15)', fg: '#22c55e', label: 'Excelente match' },
  medium: { bg: 'rgba(234,179,8,0.15)', fg: '#eab308', label: 'Match medio' },
  low: { bg: 'rgba(239,68,68,0.15)', fg: '#ef4444', label: 'Match bajo' },
  unknown: { bg: 'rgba(148,163,184,0.15)', fg: '#94a3b8', label: 'Sin datos' },
};

const containerStyle: CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontFamily: 'var(--font-display)',
  fontSize: '14px',
  fontWeight: 700,
};

const recoStyle: CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.7)',
  lineHeight: 1.5,
};

export function VoiceConsistencyBadge({
  matchLevel,
  matchScore,
  recommendations,
}: VoiceConsistencyBadgeProps) {
  const palette = COLORS[matchLevel];
  return (
    <Card variant="elevated" aria-label="Voice consistency check">
      <div style={containerStyle}>
        <div
          style={{
            ...headerStyle,
            color: palette.fg,
            backgroundColor: palette.bg,
            padding: '6px 12px',
            borderRadius: '9999px',
            alignSelf: 'flex-start',
          }}
        >
          {palette.label} · {(matchScore * 100).toFixed(0)}%
        </div>
        <ul style={{ listStyle: 'disc', paddingLeft: '18px', margin: 0 }}>
          {recommendations.map((reco) => (
            <li key={reco} style={recoStyle}>
              {reco}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
