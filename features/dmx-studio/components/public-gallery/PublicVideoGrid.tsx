'use client';

import { type CSSProperties, useEffect } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

export interface PublicVideoItem {
  readonly id: string;
  readonly hookVariant: string;
  readonly format: string;
  readonly storageUrl: string;
  readonly thumbnailUrl: string | null;
  readonly durationSeconds: number;
}

interface Props {
  readonly videos: ReadonlyArray<PublicVideoItem>;
  readonly slug: string;
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
};

export function PublicVideoGrid({ videos, slug }: Props) {
  const recordViewMutation = trpc.studio.sprint7PublicGallery.recordView.useMutation();
  useEffect(() => {
    recordViewMutation.mutate({
      asesorSlug: slug,
      deviceType: detectDeviceType(),
    });
  }, [slug, recordViewMutation]);

  if (videos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
        Aún no hay videos publicados.
      </div>
    );
  }

  return (
    <section aria-label="Videos del asesor">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '20px',
          color: 'var(--canon-cream)',
          marginBottom: '16px',
        }}
      >
        Videos
      </h2>
      <div style={gridStyle}>
        {videos.map((v) => (
          <article key={v.id} style={cardStyle}>
            {v.thumbnailUrl ? (
              // biome-ignore lint/performance/noImgElement: thumbnails Storage Supabase con dimensiones dinámicas
              <img
                src={v.thumbnailUrl}
                alt={`Video ${v.hookVariant} formato ${v.format}`}
                style={{
                  width: '100%',
                  aspectRatio: v.format === '9x16' ? '9/16' : v.format === '16x9' ? '16/9' : '1/1',
                  objectFit: 'cover',
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
            <div style={{ padding: '12px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {v.hookVariant} · {v.format}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: '4px',
                }}
              >
                {Math.round(v.durationSeconds)}s
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/mobile|iphone|android.*mobile/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  return 'desktop';
}
