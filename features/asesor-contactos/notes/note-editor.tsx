'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import type { ContactNoteLevel } from '@/shared/schemas/contact-notes';

export interface NoteEditorProps {
  initialContent?: string;
  initialLevel?: ContactNoteLevel;
  isEditing?: boolean;
  isSubmitting?: boolean;
  onSave: (input: { contentMd: string; level: ContactNoteLevel }) => void;
  onCancel?: () => void;
}

const LEVELS: readonly ContactNoteLevel[] = ['personal', 'colaborativo', 'sistema'] as const;

export function NoteEditor({
  initialContent = '',
  initialLevel = 'personal',
  isEditing = false,
  isSubmitting = false,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const t = useTranslations('AsesorContactos.notes');
  const [content, setContent] = useState(initialContent);
  const [level, setLevel] = useState<ContactNoteLevel>(initialLevel);

  const trimmed = content.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= 8000;

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 12,
    background: 'var(--surface-recessed)',
    border: '1px solid var(--canon-border)',
    borderRadius: 'var(--canon-radius-card)',
  };

  const textareaStyle: CSSProperties = {
    width: '100%',
    minHeight: 96,
    padding: 10,
    borderRadius: 'var(--canon-radius-input)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg)',
    color: 'var(--canon-cream)',
    fontSize: 13,
    fontFamily: 'var(--font-body)',
    resize: 'vertical',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  };

  const selectStyle: CSSProperties = {
    padding: '6px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg)',
    color: 'var(--canon-cream)',
    fontSize: 12,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  };

  const primaryBtnStyle: CSSProperties = {
    padding: '8px 16px',
    borderRadius: 'var(--canon-radius-pill)',
    border: 'none',
    background: isValid && !isSubmitting ? 'var(--mod-contactos)' : 'var(--canon-border-2)',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: isValid && !isSubmitting ? 'pointer' : 'not-allowed',
    opacity: isValid && !isSubmitting ? 1 : 0.65,
  };

  const secondaryBtnStyle: CSSProperties = {
    padding: '8px 14px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'transparent',
    color: 'var(--canon-cream-2)',
    fontSize: 12,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  };

  const counterStyle: CSSProperties = {
    fontSize: 10,
    color: 'var(--canon-cream-3)',
    fontVariantNumeric: 'tabular-nums',
  };

  const handleSubmit = () => {
    if (!isValid || isSubmitting) return;
    onSave({ contentMd: trimmed, level });
    if (!isEditing) {
      setContent('');
      setLevel('personal');
    }
  };

  return (
    <form
      style={wrapperStyle}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      aria-label={isEditing ? t('editor.ariaEdit') : t('editor.ariaCreate')}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={textareaStyle}
        placeholder={t('editor.placeholder')}
        maxLength={8000}
        aria-label={t('editor.contentLabel')}
        aria-invalid={!isValid}
      />
      <div style={rowStyle}>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--canon-cream-2)' }}>
            {t('editor.levelLabel')}
          </span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as ContactNoteLevel)}
            disabled={isEditing}
            style={selectStyle}
            aria-label={t('editor.levelLabel')}
          >
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {t(`level.${lv}`)}
              </option>
            ))}
          </select>
        </label>
        <span style={counterStyle}>{trimmed.length}/8000</span>
      </div>
      <div style={{ ...rowStyle, justifyContent: 'flex-end' }}>
        {onCancel ? (
          <button type="button" style={secondaryBtnStyle} onClick={onCancel}>
            {t('editor.cancel')}
          </button>
        ) : null}
        <button
          type="submit"
          style={primaryBtnStyle}
          disabled={!isValid || isSubmitting}
          aria-disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? t('editor.saving') : isEditing ? t('editor.save') : t('editor.create')}
        </button>
      </div>
    </form>
  );
}
