'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { DisclosurePill } from '@/shared/ui/primitives/canon';
import { useAcmCompute } from '../hooks/use-acm-compute';
import { useCaptacionDrawer } from '../hooks/use-captacion-drawer';
import type { CaptacionDetail } from '../lib/captaciones-loader';
import { AcmBreakdown } from './acm-breakdown';
import { CloseCaptacionDialog } from './close-captacion-dialog';
import { EditCaptacionDrawer } from './edit-captacion-drawer';
import { StatusBadge } from './status-badge';

export interface CaptacionDetailDrawerProps {
  detail: CaptacionDetail | null;
}

function formatPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M ${currency}`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K ${currency}`;
  return `$${value.toFixed(0)} ${currency}`;
}

export function CaptacionDetailDrawer({ detail }: CaptacionDetailDrawerProps) {
  const t = useTranslations('AsesorCaptaciones.detail');
  const tDisc = useTranslations('AsesorCaptaciones.disclosure');
  const { isOpen, close } = useCaptacionDrawer();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const acmCompute = useAcmCompute();

  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [isOpen]);

  if (!isOpen) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    background: 'rgba(2, 4, 11, 0.55)',
    backdropFilter: 'blur(2px)',
  };

  const dialogStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(680px, 100vw)',
    background: 'var(--surface-elevated, var(--canon-bg-2))',
    borderLeft: '1px solid var(--canon-border-2)',
    boxShadow: 'var(--shadow-canon-spotlight, 0 24px 64px rgba(0,0,0,0.4))',
    zIndex: 70,
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--canon-cream)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid var(--canon-border)',
    gap: 12,
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  };

  const titleId = 'captacion-detail-title';

  if (!detail) {
    return (
      <>
        <button
          type="button"
          aria-label={t('closeAria')}
          onClick={close}
          style={{ ...overlayStyle, border: 'none', cursor: 'pointer' }}
        />
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={dialogStyle}>
          <header style={headerStyle}>
            <h2 id={titleId} style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18 }}>
              {t('loading')}
            </h2>
            <button
              type="button"
              ref={closeRef}
              onClick={close}
              aria-label={t('closeAria')}
              style={{
                padding: 6,
                borderRadius: 8,
                border: '1px solid var(--canon-border-2)',
                background: 'transparent',
                color: 'var(--canon-cream)',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </header>
          <div style={bodyStyle}>
            <p>{t('notFound')}</p>
          </div>
        </div>
      </>
    );
  }

  const isClosed = detail.status === 'vendido' || detail.status === 'cerrado_no_listado';

  const handleRunAcm = () => {
    acmCompute.mutate({ id: detail.id });
  };

  return (
    <>
      <button
        type="button"
        aria-label={t('closeAria')}
        onClick={close}
        style={{ ...overlayStyle, border: 'none', cursor: 'pointer' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        style={dialogStyle}
      >
        <header style={headerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2
                id={titleId}
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                {detail.propietarioNombre}
              </h2>
              <StatusBadge status={detail.status} size="md" />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--canon-cream-2)' }}>
              {detail.direccion}
              {detail.ciudad ? ` · ${detail.ciudad}` : ''}
              {detail.colonia ? ` · ${detail.colonia}` : ''}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--mod-captaciones, var(--canon-cream))',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatPrice(detail.precioSolicitado, detail.currency)}
            </p>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={close}
            aria-label={t('closeAria')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--canon-radius-pill)',
              border: '1px solid var(--canon-border-2)',
              background: 'transparent',
              color: 'var(--canon-cream)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </header>

        <div style={bodyStyle}>
          <DisclosurePill tone="indigo">{tDisc('h1Notice')}</DisclosurePill>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={acmCompute.isPending}
                onClick={handleRunAcm}
                style={{
                  padding: '10px 18px',
                  borderRadius: 'var(--canon-radius-pill)',
                  background: 'var(--mod-captaciones, var(--canon-gradient))',
                  border: 'none',
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: acmCompute.isPending ? 'wait' : 'pointer',
                  opacity: acmCompute.isPending ? 0.7 : 1,
                }}
              >
                {acmCompute.isPending ? t('runningAcm') : t('runAcm')}
              </button>
              {!isClosed ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--canon-radius-pill)',
                    background: 'transparent',
                    border: '1px solid var(--canon-border-2)',
                    color: 'var(--canon-cream)',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {t('edit')}
                </button>
              ) : null}
              {!isClosed ? (
                <button
                  type="button"
                  onClick={() => setCloseDialogOpen(true)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--canon-radius-pill)',
                    background: 'transparent',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    color: '#fca5a5',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {t('closeCaptacion')}
                </button>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <DisclosurePill tone="amber">{tDisc('stubMifiel')}</DisclosurePill>
              <DisclosurePill tone="amber">{tDisc('stubAiPromocion')}</DisclosurePill>
              <DisclosurePill tone="amber">{tDisc('stubVisionClassify')}</DisclosurePill>
            </div>
          </section>

          <AcmBreakdown acm={detail.acmResult} hasFallbackZone={detail.hasSyntheticZoneScore} />

          {detail.notes ? (
            <section
              style={{
                padding: 14,
                borderRadius: 'var(--canon-radius-card)',
                background: 'var(--surface-recessed, var(--canon-bg))',
                border: '1px solid var(--canon-border-2)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--canon-cream)',
                }}
              >
                {t('notesTitle')}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--canon-cream-2)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {detail.notes}
              </p>
            </section>
          ) : null}

          {isClosed ? (
            <section
              style={{
                padding: 14,
                borderRadius: 'var(--canon-radius-card)',
                background: 'var(--surface-recessed, var(--canon-bg))',
                border: '1px solid var(--canon-border-2)',
              }}
              aria-live="polite"
            >
              <h3
                style={{
                  margin: '0 0 6px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  color: 'var(--canon-cream)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t('closedTitle')}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--canon-cream-2)' }}>
                {detail.closedMotivo ? t(`motivoLabel.${detail.closedMotivo}`) : t('motivoUnknown')}
                {detail.closedAt ? ` · ${detail.closedAt.slice(0, 10)}` : ''}
              </p>
              {detail.closedNotes ? (
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: 'var(--canon-cream-3)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {detail.closedNotes}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      {!isClosed ? (
        <EditCaptacionDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          captacion={detail}
        />
      ) : null}
      {!isClosed ? (
        <CloseCaptacionDialog
          open={closeDialogOpen}
          onClose={() => setCloseDialogOpen(false)}
          captacionId={detail.id}
          onClosed={close}
        />
      ) : null}
    </>
  );
}
