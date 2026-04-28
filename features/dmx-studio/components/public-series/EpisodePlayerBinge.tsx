'use client';

// F14.F.9 Sprint 8 BIBLIA LATERAL 7 — Episode player binge-watch sequencial.
import { type CSSProperties, useState } from 'react';

export interface BingeEpisode {
  readonly id: string;
  readonly episodeNumber: number;
  readonly title: string;
  readonly description: string | null;
  readonly narrativePhase: string | null;
  readonly titleCardStoragePath: string | null;
}

export interface EpisodePlayerBingeProps {
  readonly episodes: ReadonlyArray<BingeEpisode>;
  readonly onEpisodeChange?: (episodeId: string) => void;
}

const containerStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: 24,
};

const playerPlaceholder: CSSProperties = {
  background: 'var(--surface-recessed)',
  borderRadius: 12,
  aspectRatio: '16 / 9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--canon-cream-2)',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 22,
  color: '#FFFFFF',
  marginTop: 16,
};

const navStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 16,
  flexWrap: 'wrap',
};

const navBtnStyle = (active: boolean): CSSProperties => ({
  background: active ? 'linear-gradient(90deg, #6366F1, #EC4899)' : 'var(--surface-recessed)',
  color: '#FFFFFF',
  border: '1px solid var(--canon-border)',
  borderRadius: 9999,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
});

export function EpisodePlayerBinge({ episodes, onEpisodeChange }: EpisodePlayerBingeProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (episodes.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ color: 'var(--canon-cream-2)', textAlign: 'center', padding: 32 }}>
          Esta serie aun no tiene episodios publicados.
        </div>
      </div>
    );
  }

  const active = episodes[activeIdx];
  if (!active) return null;

  const handleSelect = (idx: number) => {
    setActiveIdx(idx);
    const ep = episodes[idx];
    if (ep && onEpisodeChange) onEpisodeChange(ep.id);
  };

  const handleNext = () => {
    if (activeIdx < episodes.length - 1) handleSelect(activeIdx + 1);
  };

  return (
    <div style={containerStyle}>
      <div style={playerPlaceholder}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28 }}>
            Capítulo {active.episodeNumber}
          </div>
          <div style={{ marginTop: 8, fontSize: 14 }}>Reproductor video pendiente upload real</div>
        </div>
      </div>

      <div style={titleStyle}>{active.title}</div>
      {active.narrativePhase ? (
        <div style={{ color: 'var(--canon-cream-2)', fontSize: 13, textTransform: 'capitalize' }}>
          Fase: {active.narrativePhase}
        </div>
      ) : null}
      {active.description ? (
        <p style={{ color: 'var(--canon-cream-2)', fontSize: 14, marginTop: 8 }}>
          {active.description}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          onClick={handleNext}
          disabled={activeIdx >= episodes.length - 1}
          style={{
            background: 'linear-gradient(90deg, #6366F1, #EC4899)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 9999,
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            opacity: activeIdx >= episodes.length - 1 ? 0.5 : 1,
          }}
        >
          Siguiente capítulo
        </button>
      </div>

      <nav style={navStyle} aria-label="Navegación capítulos">
        {episodes.map((ep, idx) => (
          <button
            key={ep.id}
            type="button"
            onClick={() => handleSelect(idx)}
            style={navBtnStyle(idx === activeIdx)}
          >
            Cap {ep.episodeNumber}
          </button>
        ))}
      </nav>
    </div>
  );
}
