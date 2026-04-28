'use client';

// F14.F.10 Sprint 9 SUB-AGENT 4 — Portfolio video grid (client component, modal player on click).
// Split: PortfolioVideoGridPresentation (pure, testable) + PortfolioVideoGrid (smart wrapper).

import { type CSSProperties, useState } from 'react';

export interface PortfolioVideoItem {
  readonly id: string;
  readonly storageUrl: string;
  readonly thumbnailUrl: string | null;
  readonly projectId: string | null;
  readonly createdAt: string;
}

interface SmartProps {
  readonly videos: ReadonlyArray<PortfolioVideoItem>;
  readonly photographerId: string;
}

interface PresentationProps {
  readonly videos: ReadonlyArray<PortfolioVideoItem>;
  readonly activeVideo: PortfolioVideoItem | null;
  readonly onSelect: (video: PortfolioVideoItem) => void;
  readonly onClose: () => void;
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '20px',
};

const cardStyle: CSSProperties = {
  borderRadius: 'var(--canon-radius-card)',
  overflow: 'hidden',
  border: '1px solid var(--canon-border)',
  background: 'var(--surface-elevated)',
  cursor: 'pointer',
  transition: 'transform var(--canon-duration-fast) var(--canon-ease-out)',
};

export function PortfolioVideoGridPresentation({
  videos,
  activeVideo,
  onSelect,
  onClose,
}: PresentationProps) {
  if (videos.length === 0) {
    return (
      <section aria-label="Videos del fotógrafo">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '22px',
            color: 'var(--canon-cream)',
            marginBottom: '16px',
          }}
        >
          Videos
        </h2>
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'rgba(255,255,255,0.6)',
            background: 'var(--surface-elevated)',
            borderRadius: 'var(--canon-radius-card)',
            border: '1px solid var(--canon-border)',
          }}
          data-empty-state="true"
        >
          Aún no hay videos publicados en este portfolio.
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Videos del fotógrafo">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '22px',
          color: 'var(--canon-cream)',
          marginBottom: '16px',
        }}
      >
        Videos
      </h2>
      <div style={gridStyle}>
        {videos.map((v) => (
          <button
            key={v.id}
            type="button"
            style={{ ...cardStyle, padding: 0, font: 'inherit' }}
            onClick={() => onSelect(v)}
            aria-label={`Ver video ${v.id}`}
            data-testid="portfolio-video-card"
          >
            {v.thumbnailUrl ? (
              // biome-ignore lint/performance/noImgElement: thumbnails Storage Supabase con dimensiones dinámicas
              <img
                src={v.thumbnailUrl}
                alt={`Video ${v.id}`}
                style={{
                  width: '100%',
                  aspectRatio: '9/16',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '9/16',
                  background: 'rgba(255,255,255,0.05)',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {activeVideo ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reproductor de video"
          data-testid="portfolio-video-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '24px',
          }}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only — outer dialog owns interactive role + Escape handler. */}
          <div
            style={{
              maxWidth: '720px',
              width: '100%',
              background: 'var(--canon-bg-2)',
              borderRadius: 'var(--canon-radius-card)',
              padding: '16px',
              border: '1px solid var(--canon-border)',
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <video
              src={activeVideo.storageUrl}
              controls
              autoPlay
              style={{
                width: '100%',
                borderRadius: '8px',
                aspectRatio: '9/16',
                background: '#000',
              }}
            >
              <track kind="captions" />
            </video>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: '12px',
                padding: '10px 18px',
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'var(--canon-cream)',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function PortfolioVideoGrid({ videos }: SmartProps) {
  const [activeVideo, setActiveVideo] = useState<PortfolioVideoItem | null>(null);

  // STUB ADR-018 — recordView tracking H2.
  // No existe procedure api.studio.sprint9Photographer.recordView.
  // Cuando esté disponible, llamar mutation aquí en handleSelect (passive analytics).
  // Issue tracker: L-NEW-PHOTOGRAPHER-PORTFOLIO-VIEW-TRACKING.
  // throw new Error('NOT_IMPLEMENTED — view tracking H2');

  return (
    <PortfolioVideoGridPresentation
      videos={videos}
      activeVideo={activeVideo}
      onSelect={(v) => setActiveVideo(v)}
      onClose={() => setActiveVideo(null)}
    />
  );
}
