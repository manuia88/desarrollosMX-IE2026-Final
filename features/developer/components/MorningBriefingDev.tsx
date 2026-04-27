'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Button, Card } from '@/shared/ui/primitives/canon';

// Real streaming integrate FASE 17 Doc Intel + Anthropic SDK

export interface MorningBriefingDevProps {
  readonly briefing: {
    readonly content: string;
    readonly generated_at: string;
    readonly is_placeholder: boolean;
    readonly cost_usd: number | null;
  } | null;
  readonly isLoading?: boolean;
  readonly onRegenerate?: () => void;
}

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: 'short',
});

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontSize: 14,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--canon-cream-2)',
};

const timestampStyle: CSSProperties = {
  margin: 0,
  fontSize: 11.5,
  color: 'var(--canon-cream-3)',
  fontFamily: 'var(--font-body)',
};

const contentStyle: CSSProperties = {
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.65,
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  whiteSpace: 'pre-wrap',
};

const placeholderBannerStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontStyle: 'italic',
  color: 'var(--canon-cream-3)',
  padding: '8px 12px',
  borderRadius: 9999,
  background: 'rgba(148, 163, 184, 0.10)',
  border: '1px solid var(--canon-border-2)',
};

const skeletonLineStyle: CSSProperties = {
  height: 12,
  borderRadius: 6,
  background:
    'linear-gradient(90deg, rgba(148, 163, 184, 0.10), rgba(148, 163, 184, 0.20), rgba(148, 163, 184, 0.10))',
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return TIMESTAMP_FORMATTER.format(date);
}

export function MorningBriefingDev({
  briefing,
  isLoading = false,
  onRegenerate,
}: MorningBriefingDevProps): React.ReactElement {
  const t = useTranslations('dev.briefing');

  return (
    <Card
      variant="elevated"
      style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
      aria-label={t('title')}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <h3 style={titleStyle}>{t('title')}</h3>
        {briefing && !isLoading ? (
          <p style={timestampStyle}>
            {t('generatedAt', { time: formatTimestamp(briefing.generated_at) })}
          </p>
        ) : null}
      </header>

      {isLoading ? (
        <div
          aria-busy="true"
          aria-live="polite"
          data-testid="briefing-skeleton"
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ ...skeletonLineStyle, width: '92%' }} />
          <div style={{ ...skeletonLineStyle, width: '78%' }} />
          <div style={{ ...skeletonLineStyle, width: '85%' }} />
        </div>
      ) : briefing ? (
        <>
          {briefing.is_placeholder ? (
            <p style={placeholderBannerStyle}>{t('placeholderBanner')}</p>
          ) : null}
          <p style={contentStyle}>{briefing.content}</p>
          {onRegenerate ? (
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={onRegenerate}>
                {t('regenerate')}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <p style={timestampStyle}>{t('empty')}</p>
      )}
    </Card>
  );
}
