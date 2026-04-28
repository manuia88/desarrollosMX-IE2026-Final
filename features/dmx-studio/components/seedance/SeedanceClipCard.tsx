'use client';

// F14.F.7 Sprint 6 BIBLIA v4 §6 — Seedance clip card (Tarea 6.1).
// DMX Studio dentro DMX único entorno (ADR-054). Canon: pill badges, zero emoji,
// translateY-only hover, native audio enabled (NOT muted) since seedance ships ambient.

import { type CSSProperties, useMemo } from 'react';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface SeedanceClipCardProps {
  readonly clip: {
    readonly id: string;
    readonly storage_path: string | null;
    readonly duration_seconds: number;
    readonly cost_usd: number | null;
    readonly status: string;
    readonly audio_context: string | null;
    readonly created_at: string;
  };
  readonly videoUrl?: string;
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '14px',
  color: '#FFFFFF',
  lineHeight: 1.3,
};

const metaStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '12px',
  fontVariantNumeric: 'tabular-nums',
};

const videoStyle: CSSProperties = {
  width: '100%',
  borderRadius: '12px',
  background: 'var(--canon-bg-1)',
  display: 'block',
};

const placeholderStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.18))',
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
};

function formatCostUsd(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return `$${value.toFixed(3)}`;
}

function formatDuration(seconds: number): string {
  return `${seconds}s`;
}

function statusTone(status: string): 'violet' | 'indigo' | 'amber' | 'rose' {
  switch (status) {
    case 'completed':
      return 'indigo';
    case 'processing':
    case 'pending':
      return 'amber';
    case 'failed':
      return 'rose';
    default:
      return 'violet';
  }
}

export function SeedanceClipCard({ clip, videoUrl }: SeedanceClipCardProps) {
  const ariaLabel = useMemo(
    () => `Clip Seedance ${clip.id.slice(0, 8)} estado ${clip.status}`,
    [clip.id, clip.status],
  );

  return (
    <Card
      variant="elevated"
      hoverable
      className="flex flex-col gap-3 p-4"
      data-testid={`seedance-clip-card-${clip.id}`}
      aria-label={ariaLabel}
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          preload="metadata"
          playsInline
          style={videoStyle}
          aria-label={`Reproducir clip ${clip.id.slice(0, 8)}`}
          data-testid={`seedance-clip-video-${clip.id}`}
        >
          <track kind="captions" />
        </video>
      ) : (
        <div style={placeholderStyle} role="img" aria-label="Clip sin URL disponible">
          {clip.status === 'processing' ? 'Generando…' : 'Sin video'}
        </div>
      )}
      <p style={titleStyle}>Clip {clip.id.slice(0, 8)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <DisclosurePill tone="indigo">{formatDuration(clip.duration_seconds)}</DisclosurePill>
        <DisclosurePill tone="violet">{formatCostUsd(clip.cost_usd)}</DisclosurePill>
        {clip.audio_context ? (
          <DisclosurePill tone="violet">Audio · {clip.audio_context}</DisclosurePill>
        ) : null}
        <DisclosurePill tone={statusTone(clip.status)}>{clip.status}</DisclosurePill>
      </div>
      <span style={metaStyle}>{new Date(clip.created_at).toLocaleString('es-MX')}</span>
    </Card>
  );
}
