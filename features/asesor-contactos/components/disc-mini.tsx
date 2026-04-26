'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { DISC_KEYS, type DiscScores } from '../schemas/filter-schemas';

interface DiscMiniProps {
  disc: DiscScores | null;
}

const DISC_COLORS: Record<string, string> = {
  D: '#fb7185',
  I: '#fbbf24',
  S: '#34d399',
  C: '#818cf8',
};

export function DiscMini({ disc }: DiscMiniProps) {
  const t = useTranslations('AsesorContactos.disc');
  if (!disc) {
    return (
      <span
        role="status"
        aria-label={t('unknownAria')}
        style={{
          fontSize: 10,
          color: 'var(--canon-cream-3)',
          padding: '2px 8px',
          border: '1px dashed var(--canon-border-2)',
          borderRadius: 'var(--canon-radius-pill)',
        }}
      >
        {t('unknownShort')}
      </span>
    );
  }

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    gap: 4,
    alignItems: 'center',
  };

  const max = Math.max(disc.D, disc.I, disc.S, disc.C, 1);

  return (
    <span
      role="img"
      style={containerStyle}
      aria-label={t('summaryAria', { D: disc.D, I: disc.I, S: disc.S, C: disc.C })}
    >
      {DISC_KEYS.map((key) => {
        const score = disc[key];
        const size = 6 + (score / max) * 8;
        const dotStyle: CSSProperties = {
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: DISC_COLORS[key] ?? '#818cf8',
          opacity: score === 0 ? 0.3 : 1,
        };
        return (
          <span
            key={key}
            aria-hidden="true"
            title={`${key}=${score}`}
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span style={dotStyle} />
            <span style={{ fontSize: 8, color: 'var(--canon-cream-2)' }}>{key}</span>
          </span>
        );
      })}
    </span>
  );
}
