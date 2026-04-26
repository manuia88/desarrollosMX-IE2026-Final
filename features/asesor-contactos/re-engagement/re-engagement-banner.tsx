'use client';

import { useTranslations } from 'next-intl';
import type { ContactoSummary } from '../lib/contactos-loader';

interface ReEngagementBannerProps {
  contactos: ContactoSummary[];
}

interface ReEngagementBucket {
  birthdayCount: number;
  staleCount: number;
}

function bucketize(contactos: ContactoSummary[]): ReEngagementBucket {
  let birthdayCount = 0;
  let staleCount = 0;
  for (const contacto of contactos) {
    if (contacto.birthdayInDays !== null && contacto.birthdayInDays <= 30) {
      birthdayCount += 1;
    }
    if (contacto.daysSinceLastContact >= 30 && contacto.status !== 'lost') {
      staleCount += 1;
    }
  }
  return { birthdayCount, staleCount };
}

export function ReEngagementBanner({ contactos }: ReEngagementBannerProps) {
  const t = useTranslations('AsesorContactos.reEngagement');
  const bucket = bucketize(contactos);
  if (bucket.birthdayCount === 0 && bucket.staleCount === 0) return null;
  return (
    <section
      role="status"
      style={{
        margin: '12px 28px 0',
        padding: '12px 16px',
        borderRadius: 'var(--canon-radius-md)',
        border: '1px solid var(--canon-border-2)',
        background: 'rgba(236,72,153,0.10)',
        color: 'var(--canon-cream)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <strong style={{ fontSize: 13, fontFamily: 'var(--font-display)' }}>{t('title')}</strong>
      {bucket.birthdayCount > 0 ? (
        <span style={{ fontSize: 12 }}>
          {t('birthdaySummary', { count: bucket.birthdayCount })}
        </span>
      ) : null}
      {bucket.staleCount > 0 ? (
        <span style={{ fontSize: 12 }}>{t('staleSummary', { count: bucket.staleCount })}</span>
      ) : null}
    </section>
  );
}
