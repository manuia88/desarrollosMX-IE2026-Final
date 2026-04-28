// F14.F.9 Sprint 8 BIBLIA — Episode status badge canon ADR-050.
import type { CSSProperties } from 'react';

export type EpisodeStatus = 'pending' | 'recommended' | 'in_progress' | 'published' | 'archived';

const STATUS_STYLES: Record<EpisodeStatus, { bg: string; fg: string; label: string }> = {
  pending: { bg: 'rgba(161,161,170,0.16)', fg: '#A1A1AA', label: 'Pendiente' },
  recommended: { bg: 'rgba(99,102,241,0.18)', fg: '#818CF8', label: 'Recomendado' },
  in_progress: { bg: 'rgba(245,158,11,0.18)', fg: '#FBBF24', label: 'En curso' },
  published: { bg: 'rgba(16,185,129,0.18)', fg: '#34D399', label: 'Publicado' },
  archived: { bg: 'rgba(113,113,122,0.16)', fg: '#71717A', label: 'Archivado' },
};

export function EpisodeStatusBadge({ status }: { readonly status: EpisodeStatus }) {
  const s = STATUS_STYLES[status];
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 9999,
    background: s.bg,
    color: s.fg,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 12,
  };
  return <span style={style}>{s.label}</span>;
}
