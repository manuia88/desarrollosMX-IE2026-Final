'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useCaptacionMutations } from '../hooks/use-captacion-mutations';

export interface CreateCaptacionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

interface FormState {
  propietarioNombre: string;
  direccion: string;
  tipoOperacion: 'venta' | 'renta';
  precioSolicitado: string;
  countryCode: string;
}

const INITIAL: FormState = {
  propietarioNombre: '',
  direccion: '',
  tipoOperacion: 'venta',
  precioSolicitado: '',
  countryCode: 'MX',
};

export function CreateCaptacionDialog({ open, onClose, onCreated }: CreateCaptacionDialogProps) {
  const t = useTranslations('AsesorCaptaciones.create');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const { create } = useCaptacionMutations();

  useEffect(() => {
    if (open) {
      setForm(INITIAL);
      setSubmitError(null);
      requestAnimationFrame(() => firstInputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'input, select, button, textarea, [tabindex]:not([tabindex="-1"])',
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
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const precioNum = Number(form.precioSolicitado);
  const isValid =
    form.propietarioNombre.trim().length >= 2 &&
    form.direccion.trim().length >= 5 &&
    Number.isFinite(precioNum) &&
    precioNum > 0;

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
    width: 'min(520px, 92vw)',
    maxHeight: '85vh',
    overflowY: 'auto',
    background: 'var(--surface-elevated, var(--canon-bg-2))',
    border: '1px solid var(--canon-border-2)',
    borderRadius: 'var(--canon-radius-card)',
    boxShadow: 'var(--shadow-canon-spotlight, 0 24px 64px rgba(0,0,0,0.5))',
    zIndex: 90,
    color: 'var(--canon-cream)',
    padding: 24,
  };

  const fieldStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
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
      const result = await create.mutateAsync({
        propietarioNombre: form.propietarioNombre.trim(),
        direccion: form.direccion.trim(),
        tipoOperacion: form.tipoOperacion,
        precioSolicitado: precioNum,
        countryCode: form.countryCode,
      });
      onCreated?.(result.id);
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
        <header style={{ marginBottom: 18 }}>
          <h2
            id={titleId}
            style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}
          >
            {t('title')}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--canon-cream-2)' }}>
            {t('subtitle')}
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={fieldStyle}>
            <label htmlFor="cap-propietario" style={labelStyle}>
              {t('fieldPropietario')}
            </label>
            <input
              id="cap-propietario"
              ref={firstInputRef}
              required
              minLength={2}
              maxLength={120}
              value={form.propietarioNombre}
              onChange={(e) => setForm((f) => ({ ...f, propietarioNombre: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor="cap-direccion" style={labelStyle}>
              {t('fieldDireccion')}
            </label>
            <input
              id="cap-direccion"
              required
              minLength={5}
              maxLength={200}
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={fieldStyle}>
              <label htmlFor="cap-tipo" style={labelStyle}>
                {t('fieldTipo')}
              </label>
              <select
                id="cap-tipo"
                value={form.tipoOperacion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipoOperacion: e.target.value as 'venta' | 'renta' }))
                }
                style={inputStyle}
              >
                <option value="venta">{t('tipoOption.venta')}</option>
                <option value="renta">{t('tipoOption.renta')}</option>
              </select>
            </div>

            <div style={fieldStyle}>
              <label htmlFor="cap-precio" style={labelStyle}>
                {t('fieldPrecio')}
              </label>
              <input
                id="cap-precio"
                required
                type="number"
                min={1}
                step="0.01"
                value={form.precioSolicitado}
                onChange={(e) => setForm((f) => ({ ...f, precioSolicitado: e.target.value }))}
                style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
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
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!isValid || create.isPending}
              title={!isValid ? t('disabledTooltip') : undefined}
              style={{
                padding: '10px 22px',
                borderRadius: 'var(--canon-radius-pill)',
                background: isValid
                  ? 'var(--mod-captaciones, var(--canon-gradient))'
                  : 'var(--canon-border-2)',
                border: 'none',
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 13,
                cursor: isValid ? 'pointer' : 'not-allowed',
                opacity: isValid ? 1 : 0.6,
              }}
            >
              {create.isPending ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
