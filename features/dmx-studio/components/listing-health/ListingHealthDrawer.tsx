'use client';

// FASE 14.F.4 Sprint 3 — Listing Health Drawer.
// 4 dimensiones (photos / description / missing fields / metadata) con progress
// bars + improvement suggestions list + CTA "Editar listing en portal".
// Drawer canon shared/ui/primitives/drawer (RadixDialog wrapper).

import { useTranslations } from 'next-intl';
import { type CSSProperties, useMemo } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Drawer } from '@/shared/ui/primitives/drawer';

export interface ListingHealthDrawerProps {
  readonly importId: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface DimensionRow {
  readonly key: 'photos' | 'description' | 'missing' | 'metadata';
  readonly labelKey:
    | 'dimensionPhotos'
    | 'dimensionDescription'
    | 'dimensionMissingFields'
    | 'dimensionMetadata';
  readonly score: number;
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '20px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  margin: '4px 0 0',
  color: 'var(--canon-cream-2)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '13.5px',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  color: 'var(--canon-cream)',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--canon-cream)',
};

const scoreNumStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '13px',
  fontVariantNumeric: 'tabular-nums',
  color: '#FFFFFF',
};

function progressFill(score: number): CSSProperties {
  const safe = Math.max(0, Math.min(100, score));
  let gradient = 'var(--gradient-score-critical, linear-gradient(90deg, #DC2626, #EF4444))';
  if (safe >= 80)
    gradient = 'var(--gradient-score-excellent, linear-gradient(90deg, #16A34A, #22C55E))';
  else if (safe >= 50)
    gradient = 'var(--gradient-score-good, linear-gradient(90deg, #F59E0B, #FBBF24))';
  return {
    width: `${safe}%`,
    height: '100%',
    background: gradient,
    borderRadius: '999px',
    transition: 'width var(--canon-duration-normal) var(--canon-ease-out)',
  };
}

const trackStyle: CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '999px',
  background: 'var(--surface-recessed)',
  overflow: 'hidden',
};

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 18px',
  borderRadius: 'var(--canon-radius-pill)',
  border: 'none',
  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
  color: '#FFFFFF',
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '13px',
  textDecoration: 'none',
};

const suggestionItemStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  lineHeight: 1.5,
  color: 'var(--canon-cream-2)',
  paddingLeft: '12px',
  borderLeft: '2px solid var(--canon-border)',
};

const missingChipStyle: CSSProperties = {
  display: 'inline-flex',
  padding: '3px 10px',
  borderRadius: 'var(--canon-radius-pill)',
  border: '1px solid rgba(245, 158, 11, 0.32)',
  background: 'rgba(245, 158, 11, 0.10)',
  color: '#fcd34d',
  fontFamily: 'var(--font-body)',
  fontSize: '11.5px',
  fontWeight: 500,
  letterSpacing: '0.02em',
};

const closeButtonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid var(--canon-border)',
  background: 'var(--surface-recessed)',
  color: 'var(--canon-cream)',
  padding: '6px 14px',
  borderRadius: 'var(--canon-radius-pill)',
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  fontWeight: 500,
  cursor: 'pointer',
};

export function ListingHealthDrawer({ importId, isOpen, onClose }: ListingHealthDrawerProps) {
  const t = useTranslations('Studio.listingHealth');
  const healthQuery = trpc.studio.listingHealth.getByUrlImport.useQuery(
    { importId },
    { enabled: isOpen },
  );
  const previewQuery = trpc.studio.urlImport.getPreview.useQuery({ importId }, { enabled: isOpen });

  const healthData = healthQuery.data as
    | {
        score_overall: number;
        score_photos_count: number;
        score_description_length: number;
        score_missing_fields: number;
        score_metadata_quality: number;
        missing_fields: unknown;
        improvement_suggestions: unknown;
      }
    | null
    | undefined;
  const score = healthData?.score_overall ?? 0;
  const sourceUrl = previewQuery.data?.source_url ?? null;

  const dimensions = useMemo<ReadonlyArray<DimensionRow>>(() => {
    return [
      {
        key: 'photos',
        labelKey: 'dimensionPhotos',
        score: healthData?.score_photos_count ?? 0,
      },
      {
        key: 'description',
        labelKey: 'dimensionDescription',
        score: healthData?.score_description_length ?? 0,
      },
      {
        key: 'missing',
        labelKey: 'dimensionMissingFields',
        score: healthData?.score_missing_fields ?? 0,
      },
      {
        key: 'metadata',
        labelKey: 'dimensionMetadata',
        score: healthData?.score_metadata_quality ?? 0,
      },
    ];
  }, [healthData]);

  const missingFields: ReadonlyArray<string> = useMemo(() => {
    const raw = healthData?.missing_fields as unknown;
    if (!Array.isArray(raw)) return [];
    const arr = raw as ReadonlyArray<unknown>;
    return arr.filter((v): v is string => typeof v === 'string');
  }, [healthData]);

  const suggestions: ReadonlyArray<string> = useMemo(() => {
    const raw = healthData?.improvement_suggestions as unknown;
    if (!Array.isArray(raw)) return [];
    const arr = raw as ReadonlyArray<unknown>;
    return arr.filter((v): v is string => typeof v === 'string');
  }, [healthData]);

  return (
    <Drawer.Root open={isOpen} onOpenChange={(o) => (o ? null : onClose())}>
      <Drawer.Content
        aria-label={t('drawerTitle')}
        data-testid="listing-health-drawer"
        className="bg-[var(--canon-bg-2)]"
      >
        <div className="flex flex-col gap-5 p-2">
          <header className="flex items-start justify-between gap-3">
            <div>
              <Drawer.Title asChild>
                <h2 style={titleStyle}>
                  {t('drawerTitle')}{' '}
                  <span
                    role="img"
                    aria-label={t('badgeAriaLabel', { score })}
                    style={scoreNumStyle}
                  >
                    · {score}/100
                  </span>
                </h2>
              </Drawer.Title>
              <Drawer.Description asChild>
                <p style={subtitleStyle}>{t('drawerSubtitle')}</p>
              </Drawer.Description>
            </div>
            <Drawer.Close asChild>
              <button type="button" style={closeButtonStyle} onClick={onClose}>
                {t('drawerClose')}
              </button>
            </Drawer.Close>
          </header>

          <section className="flex flex-col gap-3" aria-label={t('drawerTitle')}>
            {dimensions.map((dim) => (
              <div key={dim.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span style={labelStyle}>{t(dim.labelKey)}</span>
                  <span
                    role="img"
                    aria-label={t('badgeAriaLabel', { score: dim.score })}
                    style={scoreNumStyle}
                  >
                    {dim.score}/100
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={dim.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={trackStyle}
                >
                  <div style={progressFill(dim.score)} />
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <h3 style={sectionTitleStyle}>{t('missingFieldsTitle')}</h3>
            {missingFields.length === 0 ? (
              <p style={subtitleStyle}>{t('missingFieldsEmpty')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {missingFields.map((f) => (
                  <span key={f} style={missingChipStyle}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 style={sectionTitleStyle}>{t('suggestionsTitle')}</h3>
            {suggestions.length === 0 ? (
              <p style={subtitleStyle}>{t('suggestionsEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {suggestions.map((s) => (
                  <li key={s} style={suggestionItemStyle}>
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={ctaStyle}
              data-testid="listing-health-drawer-cta"
            >
              {t('editListingCta')}
            </a>
          ) : null}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  );
}
