'use client';

// FASE 14.F.3 Sprint 2 — Brand Kit live mockup preview (Tarea 2.1 BIBLIA).
// Aspect 9:16. Brand colors aplicados inline (primary+secondary gradient body, accent bottom bar).
// ADR-050 canon: zero emoji, zero hardcoded user-facing strings, motion ≤ 850ms (sin transforms).

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import type { StudioBrandFont } from '@/features/dmx-studio/schemas';

export interface BrandKitLivePreviewValues {
  readonly displayName?: string;
  readonly tagline?: string;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly accentColor?: string;
  readonly fontPreference?: StudioBrandFont;
  readonly contactPhone?: string;
  readonly introText?: string;
  readonly outroText?: string;
  readonly logoUrl?: string | null;
}

export interface BrandKitLivePreviewProps {
  readonly values: BrandKitLivePreviewValues;
}

const FALLBACK_BG = 'var(--canon-bg-2)';
const FALLBACK_ACCENT = 'var(--canon-indigo)';

function fontFamilyFor(font?: StudioBrandFont): string {
  switch (font) {
    case 'playfair':
      return "Georgia, 'Times New Roman', serif";
    case 'dm_sans':
      return 'var(--font-dm-sans), system-ui, sans-serif';
    case 'inter':
      return 'system-ui, -apple-system, sans-serif';
    default:
      return 'var(--font-display), var(--font-outfit), system-ui, sans-serif';
  }
}

function bodyBackground(primary?: string, secondary?: string): string {
  if (primary && secondary) {
    return `linear-gradient(160deg, ${primary} 0%, ${secondary} 100%)`;
  }
  if (primary) return primary;
  if (secondary) return secondary;
  return FALLBACK_BG;
}

export function BrandKitLivePreview({ values }: BrandKitLivePreviewProps) {
  const t = useTranslations('Studio.brandKit');
  const fontFamily = fontFamilyFor(values.fontPreference);
  const accent = values.accentColor ?? FALLBACK_ACCENT;
  const bottomBarText = t('previewBottomBar', {
    name: values.displayName ?? '',
    phone: values.contactPhone ?? '',
  });

  const mockupStyle: CSSProperties = {
    aspectRatio: '9 / 16',
    width: '100%',
    maxWidth: '280px',
    margin: '0 auto',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 'var(--canon-radius-card)',
    background: bodyBackground(values.primaryColor, values.secondaryColor),
    border: '1px solid var(--canon-border)',
    boxShadow: 'var(--shadow-canon-rest)',
    fontFamily,
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
  };

  const logoBoxStyle: CSSProperties = {
    position: 'absolute',
    top: '12px',
    left: '12px',
    width: '52px',
    height: '52px',
    borderRadius: 'var(--canon-radius-inner)',
    background: 'rgba(0, 0, 0, 0.35)',
    border: values.logoUrl ? '1px solid rgba(255,255,255,0.18)' : '1px dashed var(--canon-cream-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const introBadgeStyle: CSSProperties = {
    position: 'absolute',
    top: '14px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 12px',
    background: 'rgba(0, 0, 0, 0.45)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 'var(--canon-radius-pill)',
    fontSize: '10.5px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#FFFFFF',
    maxWidth: '70%',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const outroBadgeStyle: CSSProperties = {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 12px',
    background: 'rgba(0, 0, 0, 0.55)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 'var(--canon-radius-pill)',
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#FFFFFF',
    maxWidth: '80%',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '64px 18px 96px',
    textAlign: 'center',
    gap: '8px',
  };

  const titleStyle: CSSProperties = {
    fontFamily,
    fontWeight: 800,
    fontSize: '17px',
    lineHeight: 1.2,
    color: '#FFFFFF',
    textShadow: '0 2px 8px rgba(0,0,0,0.35)',
  };

  const priceStyle: CSSProperties = {
    fontFamily: 'var(--font-display), var(--font-outfit), system-ui, sans-serif',
    fontWeight: 800,
    fontSize: '22px',
    fontVariantNumeric: 'tabular-nums',
    color: '#FFFFFF',
    textShadow: '0 2px 8px rgba(0,0,0,0.35)',
  };

  const metaStyle: CSSProperties = {
    fontSize: '12px',
    color: 'rgba(240, 235, 224, 0.85)',
    fontWeight: 500,
  };

  const bottomBarStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '64px',
    background: accent,
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12.5px',
    fontWeight: 600,
    letterSpacing: '0.02em',
    padding: '0 16px',
    borderTop: '1px solid rgba(255,255,255,0.14)',
  };

  return (
    <div data-testid="brand-kit-mockup" style={mockupStyle} aria-hidden="false">
      <div data-testid="brand-kit-mockup-logo" style={logoBoxStyle}>
        {values.logoUrl ? (
          // biome-ignore lint/performance/noImgElement: signed storage URL preview, intentional
          <img
            src={values.logoUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <span
            data-testid="brand-kit-logo-placeholder"
            style={{ fontSize: '10px', color: 'var(--canon-cream-2)', fontWeight: 600 }}
          >
            {t('logoLabel')}
          </span>
        )}
      </div>

      {values.introText ? <span style={introBadgeStyle}>{values.introText}</span> : null}

      <div style={bodyStyle}>
        <span style={titleStyle}>{values.tagline ?? t('previewSampleTitle')}</span>
        <span style={priceStyle}>{t('previewSamplePrice')}</span>
        <span style={metaStyle}>{t('previewSampleArea')}</span>
        <span style={metaStyle}>{t('previewSampleZone')}</span>
      </div>

      {values.outroText ? <span style={outroBadgeStyle}>{values.outroText}</span> : null}

      <div style={bottomBarStyle} data-testid="brand-kit-mockup-bottom-bar">
        {bottomBarText.replace(/^·\s|\s·\s$/g, '').trim() || (values.displayName ?? '')}
      </div>
    </div>
  );
}
