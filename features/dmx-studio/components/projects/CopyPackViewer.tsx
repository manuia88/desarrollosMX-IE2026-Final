'use client';

// FASE 14.F.2 Sprint 1 — Copy Pack Viewer (Instagram caption + hashtags +
// WhatsApp message + portal description + narration script). Each panel
// has copy-to-clipboard button.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback, useState } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export interface CopyPackOutput {
  readonly id: string;
  readonly channel: string;
  readonly content: string;
}

export interface CopyPackViewerProps {
  readonly outputs: ReadonlyArray<CopyPackOutput>;
}

const PANEL_CHANNELS: ReadonlyArray<{
  channel: string;
  labelKey:
    | 'captionInstagramLabel'
    | 'hashtagsLabel'
    | 'wamessageLabel'
    | 'portalDescriptionLabel'
    | 'narrationScriptLabel';
}> = [
  { channel: 'instagram_caption', labelKey: 'captionInstagramLabel' },
  { channel: 'hashtags', labelKey: 'hashtagsLabel' },
  { channel: 'wa_message', labelKey: 'wamessageLabel' },
  { channel: 'portal_listing', labelKey: 'portalDescriptionLabel' },
  { channel: 'narration_script', labelKey: 'narrationScriptLabel' },
];

const labelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const contentStyle: CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  fontSize: '13.5px',
  lineHeight: 1.55,
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  maxHeight: '180px',
  overflowY: 'auto',
};

const copyBtnStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid var(--canon-border)',
  background: 'var(--surface-recessed)',
  color: 'var(--canon-cream-2)',
  padding: '6px 14px',
  borderRadius: 'var(--canon-radius-pill)',
  fontSize: '12.5px',
  fontWeight: 500,
  cursor: 'pointer',
};

export function CopyPackViewer({ outputs }: CopyPackViewerProps) {
  const t = useTranslations('Studio.result');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = useCallback(async (key: string, text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1800);
    } catch {
      setCopiedKey(null);
    }
  }, []);

  return (
    <section
      aria-label={t('copyPackTitle')}
      className="flex flex-col gap-4"
      data-testid="studio-copy-pack-viewer"
    >
      <header className="flex flex-col gap-1">
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '18px',
            color: '#FFFFFF',
          }}
        >
          {t('copyPackTitle')}
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {PANEL_CHANNELS.map(({ channel, labelKey }) => {
          const found = outputs.find((o) => o.channel === channel);
          const content = found?.content ?? '';
          return (
            <Card
              key={channel}
              variant="elevated"
              className="flex flex-col gap-3 p-5"
              data-testid={`copy-panel-${channel}`}
            >
              <div className="flex items-center justify-between">
                <span style={labelStyle}>{t(labelKey)}</span>
                <button
                  type="button"
                  style={copyBtnStyle}
                  data-testid={`copy-btn-${channel}`}
                  onClick={() => {
                    void handleCopy(channel, content);
                  }}
                  disabled={content.length === 0}
                  aria-disabled={content.length === 0}
                >
                  {copiedKey === channel ? t('copiedToast') : t('copyButton')}
                </button>
              </div>
              <p style={contentStyle}>{content || '—'}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
