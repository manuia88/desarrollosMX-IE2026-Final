'use client';

// FASE 14.F.4 Sprint 3 — Copy Pack Viewer (5 outputs).
// Tabs/paneles per channel: Caption Instagram / Mensaje WA / Descripción Portal /
// Guion Voz / Título Video. Each panel: content + Regenerate button + (when
// selected) VariationsSelector. WhatsApp panel surfaces WhatsappDeepLink.
// ADR-050 canon: white-pure heading, breath glow on active tab card,
// hover translateY-only, pill buttons, motion ≤ 850ms, FadeUp on mount.

import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import type { Json } from '@/shared/types/database';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { RegenerateButton } from './RegenerateButton';
import { VariationsSelector } from './VariationsSelector';
import { WhatsappDeepLink } from './WhatsappDeepLink';

export interface CopyPackViewerProps {
  readonly projectId: string;
}

interface CopyOutputRow {
  readonly id: string;
  readonly channel: string;
  readonly content: string | null;
  readonly variants: Json | null;
  readonly ai_model: string | null;
  readonly ai_cost_usd: number | null;
}

const KNOWN_CHANNELS = [
  'instagram_caption',
  'wa_message',
  'portal_listing',
  'narration_script',
  'video_title',
] as const;
type KnownChannel = (typeof KNOWN_CHANNELS)[number];

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '28px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
  fontFamily: 'var(--font-body)',
};

const tabBarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const contentStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '160px',
};

const errorStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  color: 'var(--canon-cream-2)',
  padding: '24px',
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
};

const SKELETON_KEYS = ['cp1', 'cp2', 'cp3', 'cp4', 'cp5'] as const;

function isKnownChannel(c: string): c is KnownChannel {
  return (KNOWN_CHANNELS as readonly string[]).includes(c);
}

function readWhatsappDeepLink(variants: Json | null): string | null {
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) return null;
  const dl = (variants as Record<string, unknown>).whatsappDeepLink;
  if (typeof dl !== 'string' || dl.length === 0) return null;
  return dl;
}

function readHashtags(variants: Json | null): ReadonlyArray<string> {
  if (!variants || typeof variants !== 'object' || Array.isArray(variants)) return [];
  const tags = (variants as Record<string, unknown>).hashtags;
  if (!Array.isArray(tags)) return [];
  return tags.filter((x): x is string => typeof x === 'string');
}

function extractPhoneFromDeepLink(deepLink: string | null): string | null {
  if (!deepLink) return null;
  const match = deepLink.match(/wa\.me\/(\d+)/);
  if (!match?.[1]) return null;
  return match[1];
}

export function CopyPackViewer({ projectId }: CopyPackViewerProps) {
  const t = useTranslations('Studio.copyPack');
  const query = trpc.studio.copyPack.getByProject.useQuery({ projectId });
  const [activeChannel, setActiveChannel] = useState<KnownChannel>('instagram_caption');
  const [openVariationsFor, setOpenVariationsFor] = useState<string | null>(null);

  const rows = (query.data ?? []) as unknown as ReadonlyArray<CopyOutputRow>;

  const byChannel = useMemo<Record<KnownChannel, CopyOutputRow | null>>(() => {
    const acc: Record<KnownChannel, CopyOutputRow | null> = {
      instagram_caption: null,
      wa_message: null,
      portal_listing: null,
      narration_script: null,
      video_title: null,
    };
    for (const row of rows) {
      if (isKnownChannel(row.channel)) {
        acc[row.channel] = row;
      }
    }
    return acc;
  }, [rows]);

  const handleRegenerateSuccess = useCallback((copyOutputId: string) => {
    setOpenVariationsFor(copyOutputId);
  }, []);

  const channelLabel = useCallback(
    (c: KnownChannel): string => {
      switch (c) {
        case 'instagram_caption':
          return t('tabCaptionInstagram');
        case 'wa_message':
          return t('tabMessageWhatsapp');
        case 'portal_listing':
          return t('tabPortalDescription');
        case 'narration_script':
          return t('tabNarrationScript');
        case 'video_title':
          return t('tabVideoTitle');
      }
    },
    [t],
  );

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-4" data-testid="copy-pack-loading">
        {SKELETON_KEYS.map((key) => (
          <div key={key} aria-hidden="true" style={skeletonStyle} />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div role="alert" style={errorStyle} data-testid="copy-pack-error">
        {t('errorLoading')}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div role="status" style={errorStyle} data-testid="copy-pack-empty">
        {t('emptyTitle')}
      </div>
    );
  }

  const activeRow = byChannel[activeChannel];

  return (
    <div className="flex flex-col gap-5" data-testid="copy-pack-viewer">
      <FadeUp delay={0}>
        <header className="flex flex-col gap-2">
          <h2 style={headingStyle}>{t('pageTitle')}</h2>
          <p style={subtitleStyle}>{t('pageSubtitle')}</p>
        </header>
      </FadeUp>

      <FadeUp delay={0.05}>
        <div role="tablist" aria-label={t('tabsAriaLabel')} style={tabBarStyle}>
          {KNOWN_CHANNELS.map((channel) => {
            const isActive = channel === activeChannel;
            return (
              <Button
                key={channel}
                type="button"
                variant={isActive ? 'primary' : 'glass'}
                size="sm"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveChannel(channel);
                  setOpenVariationsFor(null);
                }}
                data-testid={`copy-pack-tab-${channel}`}
              >
                {channelLabel(channel)}
              </Button>
            );
          })}
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        {activeRow ? (
          <Card
            variant="elevated"
            hoverable
            className="flex flex-col gap-4 p-5"
            data-testid={`copy-pack-panel-${activeChannel}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <DisclosurePill tone="violet">{channelLabel(activeChannel)}</DisclosurePill>
              {activeRow.ai_model ? (
                <DisclosurePill tone="indigo">{activeRow.ai_model}</DisclosurePill>
              ) : null}
            </div>
            <p style={contentStyle}>{activeRow.content ?? ''}</p>

            {activeChannel === 'instagram_caption' ? (
              <div className="flex flex-wrap gap-1.5" data-testid="copy-pack-hashtags">
                {readHashtags(activeRow.variants).map((tag) => (
                  <DisclosurePill key={tag} tone="indigo">
                    {tag}
                  </DisclosurePill>
                ))}
              </div>
            ) : null}

            {activeChannel === 'wa_message' ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <WhatsappDeepLink
                  phone={extractPhoneFromDeepLink(readWhatsappDeepLink(activeRow.variants))}
                  message={activeRow.content ?? ''}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <RegenerateButton
                copyOutputId={activeRow.id}
                onSuccess={() => handleRegenerateSuccess(activeRow.id)}
              />
            </div>

            {openVariationsFor === activeRow.id ? (
              <FadeUp delay={0}>
                <VariationsSelector copyOutputId={activeRow.id} />
              </FadeUp>
            ) : null}
          </Card>
        ) : (
          <div role="status" style={errorStyle} data-testid={`copy-pack-missing-${activeChannel}`}>
            {t('channelMissing')}
          </div>
        )}
      </FadeUp>
    </div>
  );
}
