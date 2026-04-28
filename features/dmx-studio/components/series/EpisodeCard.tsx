// F14.F.9 Sprint 8 BIBLIA — Episode card canon ADR-050.
import type { CSSProperties } from 'react';
import { type EpisodeStatus, EpisodeStatusBadge } from './EpisodeStatusBadge';

export interface EpisodeCardProps {
  readonly episodeNumber: number;
  readonly title: string;
  readonly status: EpisodeStatus;
  readonly narrativePhase: string | null;
  readonly titleCardStoragePath: string | null;
  readonly visualConsistency?: boolean;
  readonly onClick?: () => void;
}

const cardStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: 16,
  cursor: 'pointer',
  transition: 'transform 220ms ease, border-color 220ms ease',
  width: 240,
  flex: '0 0 auto',
};

const numberStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 28,
  color: '#FFFFFF',
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 16,
  color: '#FFFFFF',
  marginTop: 8,
  lineHeight: 1.3,
};

const phaseStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: 12,
  marginTop: 4,
  textTransform: 'capitalize',
};

const consistencyBadge: CSSProperties = {
  display: 'inline-block',
  marginTop: 8,
  padding: '2px 8px',
  borderRadius: 9999,
  background: 'rgba(99,102,241,0.18)',
  color: '#818CF8',
  fontSize: 11,
  fontWeight: 600,
};

export function EpisodeCard(props: EpisodeCardProps) {
  return (
    <button
      type="button"
      aria-label={`Capitulo ${props.episodeNumber}: ${props.title}`}
      onClick={props.onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--canon-border)';
      }}
      style={{ ...cardStyle, textAlign: 'left', width: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={numberStyle}>{String(props.episodeNumber).padStart(2, '0')}</span>
        <EpisodeStatusBadge status={props.status} />
      </div>
      <div style={titleStyle}>{props.title}</div>
      {props.narrativePhase ? <div style={phaseStyle}>{props.narrativePhase}</div> : null}
      {props.visualConsistency ? <span style={consistencyBadge}>Consistencia visual</span> : null}
      {props.titleCardStoragePath ? (
        <div style={{ ...phaseStyle, color: '#34D399' }}>Title card lista</div>
      ) : null}
    </button>
  );
}
