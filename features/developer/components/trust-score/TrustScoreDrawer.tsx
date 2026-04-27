'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useId, useRef } from 'react';
import { cn } from '@/shared/ui/primitives/canon';

type BreakdownKey =
  | 'financial_health'
  | 'on_time_delivery'
  | 'doc_transparency'
  | 'post_venta'
  | 'reviews';

const BREAKDOWN_KEYS: ReadonlyArray<BreakdownKey> = [
  'financial_health',
  'on_time_delivery',
  'doc_transparency',
  'post_venta',
  'reviews',
];

const BREAKDOWN_I18N_KEY: Record<BreakdownKey, string> = {
  financial_health: 'financialHealth',
  on_time_delivery: 'onTimeDelivery',
  doc_transparency: 'docTransparency',
  post_venta: 'postVenta',
  reviews: 'reviews',
};

export interface TrustScoreDetail {
  readonly score: number | null;
  readonly level: string | null;
  readonly breakdown: {
    readonly financial_health: number | null;
    readonly on_time_delivery: number | null;
    readonly doc_transparency: number | null;
    readonly post_venta: number | null;
    readonly reviews: number | null;
  };
  readonly improvements: ReadonlyArray<string>;
  readonly citations: ReadonlyArray<string>;
  readonly is_placeholder: boolean;
}

export interface TrustScoreDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly trustScore: TrustScoreDetail | null;
}

function clampPercent(value: number | null): number {
  if (value === null || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function TrustScoreDrawer({
  open,
  onClose,
  trustScore,
}: TrustScoreDrawerProps): React.ReactElement | null {
  const t = useTranslations('dev.trustScore');
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(2px)',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    margin: 0,
  };

  const dialogStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(420px, 100vw)',
    background: 'var(--surface-elevated, var(--canon-bg-2))',
    borderLeft: '1px solid var(--canon-border-2)',
    boxShadow: 'var(--shadow-canon-spotlight, 0 24px 64px rgba(0,0,0,0.4))',
    zIndex: 70,
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--canon-cream)',
    transform: 'translateY(0)',
    opacity: 1,
    animation: 'trust-drawer-in 240ms var(--canon-ease-out, ease-out)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    borderBottom: '1px solid var(--canon-border)',
    gap: 12,
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  };

  const sectionTitleStyle: CSSProperties = {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--canon-cream-2)',
  };

  const breakdownRowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  const breakdownLabelRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13,
    color: 'var(--canon-cream)',
  };

  const barTrackStyle: CSSProperties = {
    width: '100%',
    height: 6,
    borderRadius: 9999,
    background: 'rgba(148, 163, 184, 0.18)',
    overflow: 'hidden',
  };

  const placeholderBannerStyle: CSSProperties = {
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(99, 102, 241, 0.10)',
    border: '1px solid rgba(99, 102, 241, 0.32)',
    color: 'var(--canon-cream-2)',
    fontSize: 12,
    lineHeight: 1.5,
  };

  const citationStyle: CSSProperties = {
    margin: 0,
    fontSize: 11.5,
    color: 'var(--canon-cream-3)',
    fontStyle: 'italic',
  };

  const isPlaceholder = trustScore?.is_placeholder ?? true;

  return (
    <>
      <style>{`
        @keyframes trust-drawer-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-trust-drawer] { animation: none !important; }
        }
      `}</style>
      <button
        type="button"
        aria-label={t('drawerCloseAria')}
        onClick={onClose}
        style={overlayStyle}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-trust-drawer
        className={cn('trust-score-drawer')}
        style={dialogStyle}
      >
        <header style={headerStyle}>
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {t('drawerTitle')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t('drawerCloseAria')}
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              border: '1px solid var(--canon-border-2)',
              background: 'transparent',
              color: 'var(--canon-cream)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
            }}
          >
            {t('drawerClose')}
          </button>
        </header>

        <div style={bodyStyle}>
          {isPlaceholder ? (
            <p style={placeholderBannerStyle}>{t('drawerPlaceholderBanner')}</p>
          ) : null}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={sectionTitleStyle}>{t('breakdown.title')}</h3>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {BREAKDOWN_KEYS.map((key) => {
                const value = trustScore?.breakdown[key] ?? null;
                const pct = clampPercent(value);
                const labelKey = BREAKDOWN_I18N_KEY[key];
                return (
                  <li key={key} style={breakdownRowStyle}>
                    <div style={breakdownLabelRow}>
                      <span>{t(`breakdown.${labelKey}`)}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {value === null ? '—' : Math.round(value)}
                      </span>
                    </div>
                    <div style={barTrackStyle} aria-hidden="true">
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background:
                            value === null
                              ? 'rgba(148, 163, 184, 0.32)'
                              : 'linear-gradient(90deg, #6366f1, #ec4899)',
                          transition: 'width var(--canon-duration-normal, 240ms) ease',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* TODO L-NEW-STUDIO-TRUST-BOOST F14.F.2+: mention +5 pts cuando studio_video_projects published >= 1 */}
            {/* FASE 14.F.4 Sprint 3 EXTEND L-NEW-STUDIO-TRUST-BOOST: agregar entry "Studio Copy Pack uso = +2 pts adicional doc_transparency" cuando calculateStudioCopyPackBonus retorna 2. Lib en features/dmx-studio/lib/cross-functions/trust-score-boost.ts. Activación cron H2 escribe breakdown.studio_copy_pack_signal. UI: agregar item en improvements list cuando boost > 0 — usa key i18n dev.trustScore.improvements.studioCopyPackBonus. */}
            <h3 style={sectionTitleStyle}>{t('improvements.title')}</h3>
            {trustScore && trustScore.improvements.length > 0 ? (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--canon-cream)',
                }}
              >
                {trustScore.improvements.map((item) => (
                  <li key={`imp-${item}`}>{item}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--canon-cream-2)' }}>
                {t('improvements.empty')}
              </p>
            )}
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={sectionTitleStyle}>{t('citations.title')}</h3>
            {trustScore && trustScore.citations.length > 0 ? (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {trustScore.citations.map((cite) => (
                  <li key={`cite-${cite}`} style={citationStyle}>
                    {cite}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={citationStyle}>{t('citations.empty')}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
