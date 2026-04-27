'use client';

// FASE 14.F.4 Sprint 3 — Single import preview card.
// Renders thumbnail (1ra og:image) + title + datos extraídos (price/area/bedrooms/zone/photos).
// 3 actions: Confirm + Edit + Cancel. Loading skeleton mientras pending|scraping.
// ADR-050 canon: glass card, brand gradient buttons, translateY only.

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { StudioPortal } from '@/features/dmx-studio/schemas';
import { Button, Card } from '@/shared/ui/primitives/canon';

export type UrlPreviewStatus =
  | 'pending'
  | 'scraping'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'manual_required';

export interface UrlPreviewData {
  readonly title: string | null;
  readonly portal: StudioPortal;
  readonly thumbnailUrl: string | null;
  readonly priceLocal: number | null;
  readonly currency: string | null;
  readonly areaM2: number | null;
  readonly bedrooms: number | null;
  readonly bathrooms: number | null;
  readonly zone: string | null;
  readonly photosCount: number;
  readonly status: UrlPreviewStatus;
  readonly errorMessage: string | null;
}

export interface UrlPreviewCardProps {
  readonly importId: string;
  readonly preview: UrlPreviewData;
  readonly onConfirm: (importId: string) => void;
  readonly onEdit: (importId: string) => void;
  readonly onCancel: (importId: string) => void;
  readonly healthBadgeSlot?: ReactNode;
  readonly disabled?: boolean;
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--canon-cream-2)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--canon-cream)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Skeleton({ height, width }: { height: string; width: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
        borderRadius: 'var(--canon-radius-pill)',
      }}
    />
  );
}

export function UrlPreviewCard({
  importId,
  preview,
  onConfirm,
  onEdit,
  onCancel,
  healthBadgeSlot,
  disabled,
}: UrlPreviewCardProps) {
  const t = useTranslations('Studio.urlImport');

  const isLoading = preview.status === 'pending' || preview.status === 'scraping';
  const isCompleted = preview.status === 'completed';
  const isFailed =
    preview.status === 'failed' ||
    preview.status === 'blocked' ||
    preview.status === 'manual_required';

  const formatPrice = (value: number | null, currency: string | null): string => {
    if (value === null) return t('noData');
    const cur = currency ?? 'MXN';
    return `${cur} ${value.toLocaleString('es-MX')}`;
  };

  return (
    <Card
      variant="elevated"
      style={{
        padding: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid={`url-preview-${importId}`}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          background: 'var(--surface-recessed)',
          overflow: 'hidden',
        }}
      >
        {isLoading && <Skeleton height="100%" width="100%" />}
        {!isLoading && preview.thumbnailUrl && (
          <div
            role="img"
            aria-label={preview.title ?? t('previewThumbAlt')}
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${preview.thumbnailUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'block',
            }}
          />
        )}
        {!isLoading && !preview.thumbnailUrl && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              color: 'var(--canon-cream-2)',
            }}
          >
            {t('noPhoto')}
          </div>
        )}
        {healthBadgeSlot && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
            }}
          >
            {healthBadgeSlot}
          </div>
        )}
      </div>

      <div
        style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {isLoading ? (
            <Skeleton height="20px" width="65%" />
          ) : (
            <h3
              className="font-[var(--font-display)] text-xl font-extrabold tracking-tight"
              style={{ color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}
            >
              {preview.title ?? t('untitled')}
            </h3>
          )}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--canon-indigo-2)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {t(`portal.${preview.portal}` as never)}
          </span>
        </div>

        {isLoading && (
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--canon-cream-2)',
            }}
          >
            {t('previewLoading')}
          </p>
        )}

        {isCompleted && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '12px',
            }}
          >
            <StatLine
              label={t('statPrice')}
              value={formatPrice(preview.priceLocal, preview.currency)}
            />
            <StatLine
              label={t('statArea')}
              value={preview.areaM2 !== null ? `${preview.areaM2} m²` : t('noData')}
            />
            <StatLine
              label={t('statBedrooms')}
              value={preview.bedrooms !== null ? String(preview.bedrooms) : t('noData')}
            />
            <StatLine
              label={t('statBathrooms')}
              value={preview.bathrooms !== null ? String(preview.bathrooms) : t('noData')}
            />
            <StatLine label={t('statZone')} value={preview.zone ?? t('noData')} />
            <StatLine label={t('statPhotos')} value={String(preview.photosCount)} />
          </div>
        )}

        {isFailed && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '10px 14px',
              background: 'rgba(244,63,94,0.10)',
              border: '1px solid rgba(244,63,94,0.30)',
              borderRadius: 'var(--canon-radius-card)',
              fontSize: '13px',
              color: '#FCA5A5',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '4px' }}>
              {preview.status === 'blocked' ? t('errorBlocked') : t('errorFailed')}
            </strong>
            {preview.errorMessage ?? t('errorUnknown')}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCancel(importId)}
            disabled={disabled}
          >
            {t('cancelCta')}
          </Button>
          <Button
            type="button"
            variant="glass"
            size="sm"
            onClick={() => onEdit(importId)}
            disabled={disabled || !isCompleted}
          >
            {t('editCta')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onConfirm(importId)}
            disabled={disabled || !isCompleted}
            data-testid={`url-preview-confirm-${importId}`}
          >
            {t('confirmCta')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
