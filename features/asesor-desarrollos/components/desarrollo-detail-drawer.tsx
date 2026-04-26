'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useRef } from 'react';
import { IconX } from '@/shared/ui/icons/canon-icons';
import { GlassOverlay } from '@/shared/ui/primitives/canon';
import { useDesarrolloDrawer } from '../hooks/use-desarrollo-drawer';
import type { DesarrolloSummary } from '../lib/desarrollos-loader';
import { PANE_KEYS, type PaneKey } from '../lib/filter-schemas';

export interface DesarrolloDetailDrawerProps {
  project: DesarrolloSummary | null;
}

export function DesarrolloDetailDrawer({ project }: DesarrolloDetailDrawerProps) {
  const t = useTranslations('AsesorDesarrollos.drawer');
  const { isOpen, pane, close, setPane } = useDesarrolloDrawer();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus();
    }
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
  };

  const dialogStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(640px, 100vw)',
    background: 'var(--surface-elevated)',
    borderLeft: '1px solid var(--canon-border-2)',
    boxShadow: 'var(--shadow-canon-spotlight)',
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

  const tabsRowStyle: CSSProperties = {
    display: 'flex',
    gap: 4,
    padding: '8px 24px',
    borderBottom: '1px solid var(--canon-border)',
    overflowX: 'auto',
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  };

  const titleId = 'desarrollos-drawer-title';

  return (
    <>
      <button
        type="button"
        aria-label={t('close')}
        onClick={close}
        style={{
          ...overlayStyle,
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        <GlassOverlay style={{ position: 'absolute', inset: 0 }} />
      </button>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={dialogStyle}
      >
        <div style={headerStyle}>
          <h2
            id={titleId}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              margin: 0,
            }}
          >
            {project?.name ?? t('title')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={t('close')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 'var(--canon-radius-pill)',
              border: '1px solid var(--canon-border-2)',
              background: 'transparent',
              color: 'var(--canon-cream)',
              cursor: 'pointer',
            }}
          >
            <IconX size={16} aria-hidden="true" />
          </button>
        </div>

        <div style={tabsRowStyle} role="tablist" aria-label={t('panes.overview')}>
          {PANE_KEYS.map((key) => {
            const isActive = pane === key;
            const buttonStyle: CSSProperties = {
              padding: '6px 14px',
              borderRadius: 'var(--canon-radius-pill)',
              border: '1px solid',
              borderColor: isActive ? 'transparent' : 'var(--canon-border-2)',
              background: isActive ? 'var(--canon-gradient)' : 'transparent',
              color: isActive ? '#fff' : 'var(--canon-cream-2)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            };
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setPane(key)}
                style={buttonStyle}
              >
                {t(`panes.${key}`)}
              </button>
            );
          })}
        </div>

        <div style={bodyStyle} role="tabpanel">
          {project ? (
            <DrawerPaneBody pane={pane} project={project} />
          ) : (
            <DrawerPlaceholder pane={pane} />
          )}
        </div>
      </div>
    </>
  );
}

function DrawerPlaceholder({ pane }: { pane: PaneKey }) {
  const t = useTranslations('AsesorDesarrollos.drawer');
  return (
    <div
      style={{
        padding: '32px 0',
        color: 'var(--canon-cream-2)',
        fontSize: 14,
        fontFamily: 'var(--font-body)',
      }}
    >
      <p>{t(`panes.${pane}`)}</p>
      <p style={{ marginTop: 8, color: 'var(--canon-cream-3)' }}>{t('minimapStub')}</p>
    </div>
  );
}

function DrawerPaneBody({ pane, project }: { pane: PaneKey; project: DesarrolloSummary }) {
  const t = useTranslations('AsesorDesarrollos.drawer');
  const ubicacion = [project.colonia, project.ciudad].filter(Boolean).join(' · ');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: 'var(--canon-cream-2)' }}>{ubicacion}</p>
      <p style={{ fontSize: 12, color: 'var(--canon-cream-3)' }}>{t(`panes.${pane}`)}</p>
    </div>
  );
}
