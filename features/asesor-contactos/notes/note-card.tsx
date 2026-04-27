'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ContactNoteLevel } from '@/shared/schemas/contact-notes';

export interface NoteCardProps {
  id: string;
  level: ContactNoteLevel;
  authorUserId: string;
  contentMd: string;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
  onEdit?: ((id: string) => void) | undefined;
  onDelete?: ((id: string) => void) | undefined;
}

const LEVEL_TINTS: Record<ContactNoteLevel, { bg: string; fg: string; label: string }> = {
  personal: { bg: 'rgba(99,102,241,0.16)', fg: '#a5b4fc', label: 'personal' },
  colaborativo: { bg: 'rgba(168,85,247,0.18)', fg: '#c4b5fd', label: 'colaborativo' },
  sistema: { bg: 'rgba(20,184,166,0.18)', fg: '#5eead4', label: 'sistema' },
};

function formatRelativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function NoteCard({
  id,
  level,
  contentMd,
  createdAt,
  updatedAt,
  isOwner,
  onEdit,
  onDelete,
}: NoteCardProps) {
  const t = useTranslations('AsesorContactos.notes');
  const tone = LEVEL_TINTS[level];
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const cardStyle: CSSProperties = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--canon-border)',
    borderRadius: 'var(--canon-radius-card)',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  };

  const levelPillStyle: CSSProperties = {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    background: tone.bg,
    color: tone.fg,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const metaStyle: CSSProperties = {
    fontSize: 10,
    color: 'var(--canon-cream-3)',
    fontVariantNumeric: 'tabular-nums',
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    justifyContent: 'flex-end',
  };

  const actionBtnStyle: CSSProperties = {
    padding: '4px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'transparent',
    color: 'var(--canon-cream-2)',
    fontSize: 11,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  };

  const dangerBtnStyle: CSSProperties = {
    ...actionBtnStyle,
    color: '#fb7185',
    borderColor: 'rgba(244,63,94,0.4)',
  };

  return (
    <article style={cardStyle} data-note-id={id}>
      <header style={headerStyle}>
        <span style={levelPillStyle}>{t(`level.${level}`)}</span>
        <span style={metaStyle}>
          {formatRelativeDate(createdAt)}
          {updatedAt !== createdAt ? ` (${t('edited')})` : ''}
        </span>
      </header>
      <div
        style={{
          fontSize: 13,
          color: 'var(--canon-cream)',
          lineHeight: 1.5,
          fontFamily: 'var(--font-body)',
        }}
      >
        <ReactMarkdown>{contentMd}</ReactMarkdown>
      </div>
      {isOwner && (onEdit || onDelete) ? (
        <footer style={actionsStyle}>
          {onEdit ? (
            <button
              type="button"
              style={actionBtnStyle}
              onClick={() => onEdit(id)}
              aria-label={t('actions.editAria')}
            >
              {t('actions.edit')}
            </button>
          ) : null}
          {onDelete ? (
            confirmingDelete ? (
              <>
                <button
                  type="button"
                  style={actionBtnStyle}
                  onClick={() => setConfirmingDelete(false)}
                >
                  {t('actions.cancel')}
                </button>
                <button
                  type="button"
                  style={dangerBtnStyle}
                  onClick={() => {
                    onDelete(id);
                    setConfirmingDelete(false);
                  }}
                  aria-label={t('actions.confirmDeleteAria')}
                >
                  {t('actions.confirmDelete')}
                </button>
              </>
            ) : (
              <button
                type="button"
                style={dangerBtnStyle}
                onClick={() => setConfirmingDelete(true)}
                aria-label={t('actions.deleteAria')}
              >
                {t('actions.delete')}
              </button>
            )
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
