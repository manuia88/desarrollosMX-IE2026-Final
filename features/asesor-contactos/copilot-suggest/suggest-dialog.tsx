'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useMemo, useRef } from 'react';
import {
  buildSuggestions,
  type DiscLetter,
  type LeadStatusForSuggest,
  type Suggestion,
  type SuggestionPriority,
} from '@/shared/lib/asesor-copilot/suggestions-engine';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export interface SuggestDialogProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  leadStatus: LeadStatusForSuggest;
  buyerTwinDisc: DiscLetter | null;
  lastContactDays: number;
  familySize?: number | null;
}

const PRIORITY_TONES: Record<SuggestionPriority, { bg: string; fg: string }> = {
  high: { bg: 'rgba(244,63,94,0.18)', fg: '#fb7185' },
  med: { bg: 'rgba(245,158,11,0.18)', fg: '#fbbf24' },
  low: { bg: 'rgba(99,102,241,0.18)', fg: '#a5b4fc' },
};

export function SuggestDialog({
  open,
  onClose,
  contactName,
  leadStatus,
  buyerTwinDisc,
  lastContactDays,
  familySize,
}: SuggestDialogProps) {
  const t = useTranslations('AsesorContactos.copilot');
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const suggestions: Suggestion[] = useMemo(
    () =>
      buildSuggestions({
        leadStatus,
        buyerTwinDisc,
        lastContactDays,
        familySize: familySize ?? null,
      }),
    [leadStatus, buyerTwinDisc, lastContactDays, familySize],
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(8, 10, 18, 0.55)',
    zIndex: 70,
    display: 'flex',
    justifyContent: 'flex-end',
  };

  const drawerStyle: CSSProperties = {
    width: 'min(440px, 100vw)',
    background: 'var(--surface-elevated)',
    borderLeft: '1px solid var(--canon-border)',
    boxShadow: 'var(--shadow-canon-spotlight, 0 0 80px rgba(168,85,247,0.3))',
    padding: 24,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--canon-cream)',
    margin: 0,
    background: 'var(--gradient-ai)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  const contextStyle: CSSProperties = {
    fontSize: 13,
    color: 'var(--canon-cream-2)',
    margin: 0,
    fontFamily: 'var(--font-body)',
  };

  const itemStyle: CSSProperties = {
    background: 'var(--canon-bg-2)',
    border: '1px solid var(--canon-border)',
    borderRadius: 'var(--canon-radius-card)',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  const closeBtnStyle: CSSProperties = {
    padding: '6px 12px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border)',
    background: 'transparent',
    color: 'var(--canon-cream-2)',
    cursor: 'pointer',
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: ESC handler attached at window via useEffect.
    <div
      style={overlayStyle}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t('dialog.aria', { name: contactName })}
    >
      <aside style={drawerStyle}>
        <header
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <div>
            <h2 style={titleStyle}>{t('dialog.title')}</h2>
            <p style={contextStyle}>
              {t('dialog.contextSummary', {
                name: contactName,
                status: t(`leadStatus.${leadStatus}`),
                disc: buyerTwinDisc ?? '—',
                days: lastContactDays,
              })}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            style={closeBtnStyle}
            aria-label={t('dialog.closeAria')}
          >
            {t('dialog.close')}
          </button>
        </header>

        <DisclosurePill tone="amber">{t('dialog.disclosureDeterministic')}</DisclosurePill>

        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
          aria-label={t('dialog.listAria')}
        >
          {suggestions.map((s) => {
            const tone = PRIORITY_TONES[s.priority];
            return (
              <li key={s.actionKey} style={itemStyle}>
                <header
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      padding: '2px 10px',
                      borderRadius: 'var(--canon-radius-pill)',
                      background: tone.bg,
                      color: tone.fg,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {t(`priority.${s.priority}`)}
                  </span>
                </header>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--canon-cream)',
                    margin: 0,
                  }}
                >
                  {t(`actions.${s.actionKey}`)}
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--canon-cream-2)',
                    margin: 0,
                    fontFamily: 'var(--font-body)',
                    lineHeight: 1.5,
                  }}
                >
                  {t(`reasons.${s.reasonKey}`)}
                </p>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
