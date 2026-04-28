'use client';

// F14.F.9 Sprint 8 BIBLIA Upgrade 4 — Timeline expansible cards episodios horizontal scroll.
import type { CSSProperties } from 'react';
import { EpisodeCard } from './EpisodeCard';
import type { EpisodeStatus } from './EpisodeStatusBadge';

export interface TimelineEpisode {
  readonly id: string;
  readonly episodeNumber: number;
  readonly title: string;
  readonly status: EpisodeStatus;
  readonly narrativePhase: string | null;
  readonly titleCardStoragePath: string | null;
}

export interface SeriesTimelineExpansibleProps {
  readonly episodes: ReadonlyArray<TimelineEpisode>;
  readonly onSelectEpisode: (episodeId: string) => void;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  gap: 16,
  overflowX: 'auto',
  paddingBottom: 12,
  scrollSnapType: 'x mandatory',
};

const itemStyle: CSSProperties = {
  scrollSnapAlign: 'start',
  flex: '0 0 240px',
};

export function SeriesTimelineExpansible({
  episodes,
  onSelectEpisode,
}: SeriesTimelineExpansibleProps) {
  if (episodes.length === 0) {
    return (
      <div style={{ color: 'var(--canon-cream-2)', fontSize: 14 }}>
        Aun no hay episodios. Agrega el primer episodio para arrancar tu serie.
      </div>
    );
  }
  return (
    <ul
      aria-label="Linea de tiempo episodios"
      style={{ ...containerStyle, listStyle: 'none', margin: 0 }}
    >
      {episodes.map((ep) => (
        <li key={ep.id} style={itemStyle}>
          <EpisodeCard
            episodeNumber={ep.episodeNumber}
            title={ep.title}
            status={ep.status}
            narrativePhase={ep.narrativePhase}
            titleCardStoragePath={ep.titleCardStoragePath}
            onClick={() => onSelectEpisode(ep.id)}
          />
        </li>
      ))}
    </ul>
  );
}
