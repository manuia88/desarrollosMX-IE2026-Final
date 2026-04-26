'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useRef } from 'react';
import { DisclosurePill } from '@/shared/ui/primitives/canon';
import { useBusquedaDrawer } from '../hooks/use-busqueda-drawer';
import type { BusquedaDetail } from '../lib/busquedas-loader';
import { MatchScoreBadge } from './match-score-badge';

export interface BusquedaDetailDrawerProps {
  detail: BusquedaDetail | null;
}

function formatPrice(value: number | null, currency: string): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M ${currency}`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K ${currency}`;
  return `$${value.toFixed(0)} ${currency}`;
}

export function BusquedaDetailDrawer({ detail }: BusquedaDetailDrawerProps) {
  const t = useTranslations('AsesorBusquedas.drawer');
  const tRationale = useTranslations('AsesorBusquedas.rationale');
  const { isOpen, close } = useBusquedaDrawer();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

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
    width: 'min(640px, 100vw)',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--canon-border)',
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  };

  const matchRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 'var(--canon-radius-card)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg)',
  };

  const titleId = 'busquedas-drawer-title';

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

  const proyectosById = new Map(detail.matchedProyectos.map((p) => [p.id, p]));
  const unidadesById = new Map(detail.matchedUnidades.map((u) => [u.id, u]));

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
          <div>
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              {detail.leadName ?? t('leadUnknown')}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--canon-cream-2)' }}>
              {t('matchedSummary', { count: detail.matches.length })}
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
          {detail.hasSyntheticZoneScore ? (
            <DisclosurePill tone="amber">{t('syntheticZoneNotice')}</DisclosurePill>
          ) : null}

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 14 }}>
              {t('criteriaTitle')}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--canon-cream-2)' }}>
              {detail.criteria.operacion} · {detail.criteria.tipo ?? '—'} ·{' '}
              {formatPrice(detail.criteria.price_min ?? null, detail.criteria.currency)} –{' '}
              {formatPrice(detail.criteria.price_max ?? null, detail.criteria.currency)}
            </p>
          </section>

          <section>
            <h3 style={{ margin: '0 0 8px', fontFamily: 'var(--font-display)', fontSize: 14 }}>
              {t('matchesTitle')}
            </h3>
            {detail.matches.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--canon-cream-3)' }}>
                {t('noMatches')}
              </p>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {detail.matches.map((m) => {
                  const proyecto = proyectosById.get(m.proyectoId);
                  const unidad = unidadesById.get(m.unidadId);
                  return (
                    <li key={m.unidadId} style={matchRowStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                          {proyecto?.nombre ?? t('proyectoUnknown')}
                        </strong>
                        <span style={{ fontSize: 12, color: 'var(--canon-cream-2)' }}>
                          {[proyecto?.colonia, proyecto?.ciudad].filter(Boolean).join(' · ')}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--canon-cream)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {unidad
                            ? `${unidad.numero} · ${unidad.recamaras ?? '—'} ${t('rec')} · ${formatPrice(unidad.priceMxn, proyecto?.currency ?? 'MXN')}`
                            : '—'}
                        </span>
                        {m.rationale.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {m.rationale.map((r) => (
                              <span
                                key={r}
                                style={{
                                  display: 'inline-flex',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--canon-radius-pill)',
                                  background: 'var(--canon-bg-2)',
                                  border: '1px solid var(--canon-border-2)',
                                  fontSize: 10,
                                  color: 'var(--canon-cream-2)',
                                }}
                              >
                                {tRationale(r.replace('rationale.', ''))}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <MatchScoreBadge score={m.total} breakdown={m.breakdown} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
