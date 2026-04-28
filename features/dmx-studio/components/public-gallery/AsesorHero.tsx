import type { CSSProperties } from 'react';
import type { PublicGalleryData } from './PublicGalleryPage';

interface Props {
  readonly data: PublicGalleryData;
}

const heroStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  padding: '40px 24px',
  textAlign: 'center',
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border)',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  color: 'var(--canon-cream)',
  lineHeight: 1.1,
  backgroundImage: 'var(--canon-gradient)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
};

export function AsesorHero({ data }: Props) {
  const displayName = data.brandKit?.display_name ?? data.gallery.title;
  const tagline = data.brandKit?.tagline ?? data.gallery.bio ?? '';
  const coverUrl = data.gallery.cover_image_url;

  return (
    <header style={heroStyle}>
      {coverUrl ? (
        // biome-ignore lint/performance/noImgElement: imágenes externas Storage Supabase, sin optimization next/image necesaria H1
        <img
          src={coverUrl}
          alt={displayName}
          width={120}
          height={120}
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid var(--canon-border-2)',
          }}
        />
      ) : null}
      <h1 style={titleStyle}>{displayName}</h1>
      {tagline ? (
        <p
          style={{
            fontFamily: 'var(--font-text)',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.75)',
            maxWidth: '640px',
            lineHeight: 1.5,
          }}
        >
          {tagline}
        </p>
      ) : null}
    </header>
  );
}
