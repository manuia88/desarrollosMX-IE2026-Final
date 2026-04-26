'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, type FormEvent, useEffect, useId, useRef, useState } from 'react';
import {
  useCaptacionMutations,
  useInvalidateCaptacionQueries,
} from '../hooks/use-captacion-mutations';

export interface CloseCaptacionDialogProps {
  open: boolean;
  onClose: () => void;
  captacionId: string;
  onClosed?: () => void;
}

const MOTIVOS = [
  'vendida',
  'propietario_decidio_no_vender',
  'precio_no_competitivo',
  'otro',
] as const;
type Motivo = (typeof MOTIVOS)[number];

export function CloseCaptacionDialog({
  open,
  onClose,
  captacionId,
  onClosed,
}: CloseCaptacionDialogProps) {
  const t = useTranslations('AsesorCaptaciones.close');
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const { close } = useCaptacionMutations();
  const invalidate = useInvalidateCaptacionQueries();

  const [confirmText, setConfirmText] = useState('');
  const [motivo, setMotivo] = useState<Motivo>('vendida');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setMotivo('vendida');
      setNotes('');
      setSubmitError(null);
      requestAnimationFrame(() => firstInputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isValid = confirmText === 'CERRAR';

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 80,
    background: 'rgba(2, 4, 11, 0.65)',
    backdropFilter: 'blur(2px)',
  };

  const dialogStyle: CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(480px, 92vw)',
    background: 'var(--surface-elevated, var(--canon-bg-2))',
    border: '1px solid var(--canon-border-2)',
    borderRadius: 'var(--canon-radius-card)',
    boxShadow: 'var(--shadow-canon-spotlight, 0 24px 64px rgba(0,0,0,0.5))',
    zIndex: 90,
    color: 'var(--canon-cream)',
    padding: 24,
  };

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--canon-cream-2)',
  };

  const inputStyle: CSSProperties = {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg)',
    color: 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitError(null);
    try {
      await close.mutateAsync({
        id: captacionId,
        motivo,
        notes: notes.trim() || undefined,
        confirmText: 'CERRAR',
        closedAsListed: motivo === 'vendida',
      });
      invalidate.invalidateOne(captacionId);
      onClosed?.();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('errorGeneric'));
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={t('closeAria')}
        onClick={onClose}
        style={{ ...overlayStyle, border: 'none', cursor: 'pointer' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        style={dialogStyle}
      >
        <header style={{ marginBottom: 14 }}>
          <h2
            id={titleId}
            style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}
          >
            {t('title')}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--canon-cream-2)' }}>
            {t('subtitle')}
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="close-motivo" style={labelStyle}>
              {t('fieldMotivo')}
            </label>
            <select
              id="close-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as Motivo)}
              style={inputStyle}
            >
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>
                  {t(`motivoOption.${m}`)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="close-notes" style={labelStyle}>
              {t('fieldNotes')}
            </label>
            <textarea
              id="close-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="close-confirm" style={labelStyle}>
              {t('fieldConfirm')}
            </label>
            <input
              id="close-confirm"
              ref={firstInputRef}
              required
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CERRAR"
              pattern="CERRAR"
              autoComplete="off"
              spellCheck={false}
              style={{ ...inputStyle, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
            />
          </div>

          {submitError ? (
            <div
              style={{
                fontSize: 12,
                color: '#fca5a5',
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.32)',
              }}
              role="alert"
            >
              {submitError}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--canon-radius-pill)',
                border: '1px solid var(--canon-border-2)',
                background: 'transparent',
                color: 'var(--canon-cream-2)',
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!isValid || close.isPending}
              title={!isValid ? t('disabledTooltip') : undefined}
              style={{
                padding: '10px 22px',
                borderRadius: 'var(--canon-radius-pill)',
                background: isValid
                  ? 'linear-gradient(90deg, #ef4444, #b91c1c)'
                  : 'var(--canon-border-2)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                cursor: isValid ? 'pointer' : 'not-allowed',
                opacity: isValid ? 1 : 0.6,
              }}
            >
              {close.isPending ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
