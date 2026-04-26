'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { DisclosurePill } from '@/shared/ui/primitives/canon';
import { useCaptacionMutations } from '../hooks/use-captacion-mutations';
import type { CaptacionDetail } from '../lib/captaciones-loader';

export interface EditCaptacionDrawerProps {
  open: boolean;
  onClose: () => void;
  captacion: CaptacionDetail;
}

export function EditCaptacionDrawer({ open, onClose, captacion }: EditCaptacionDrawerProps) {
  const t = useTranslations('AsesorCaptaciones.edit');
  const tDisc = useTranslations('AsesorCaptaciones.disclosure');
  const titleId = useId();
  const { update } = useCaptacionMutations();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const [direccion, setDireccion] = useState(captacion.direccion);
  const [ciudad, setCiudad] = useState(captacion.ciudad ?? '');
  const [colonia, setColonia] = useState(captacion.colonia ?? '');
  const [precio, setPrecio] = useState(String(captacion.precioSolicitado));
  const [tipoOperacion, setTipoOperacion] = useState<'venta' | 'renta'>(captacion.tipoOperacion);
  const [notes, setNotes] = useState(captacion.notes ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDireccion(captacion.direccion);
    setCiudad(captacion.ciudad ?? '');
    setColonia(captacion.colonia ?? '');
    setPrecio(String(captacion.precioSolicitado));
    setTipoOperacion(captacion.tipoOperacion);
    setNotes(captacion.notes ?? '');
    setSubmitError(null);
  }, [open, captacion]);

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

  const precioNum = Number(precio);
  const isValid = direccion.trim().length >= 5 && Number.isFinite(precioNum) && precioNum > 0;

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
    width: 'min(520px, 100vw)',
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
    gap: 16,
  };

  const sectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 14,
    borderRadius: 'var(--canon-radius-card)',
    background: 'var(--surface-recessed, var(--canon-bg))',
    border: '1px solid var(--canon-border-2)',
  };

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--canon-cream-2)',
  };

  const inputStyle: CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg)',
    color: 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
  };

  const sectionTitleStyle: CSSProperties = {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--canon-cream)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitError(null);
    try {
      await update.mutateAsync({
        id: captacion.id,
        direccion: direccion.trim(),
        ciudad: ciudad.trim() || null,
        colonia: colonia.trim() || null,
        precioSolicitado: precioNum,
        tipoOperacion,
        notes: notes.trim() || null,
      });
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
        <header style={headerStyle}>
          <h2
            id={titleId}
            style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}
          >
            {t('title')}
          </h2>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
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

        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div style={bodyStyle}>
            <section style={sectionStyle} aria-labelledby="edit-sec-ubicacion">
              <h3 id="edit-sec-ubicacion" style={sectionTitleStyle}>
                {t('sectionLocation')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="edit-direccion" style={labelStyle}>
                  {t('fieldDireccion')}
                </label>
                <input
                  id="edit-direccion"
                  required
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  minLength={5}
                  maxLength={200}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="edit-ciudad" style={labelStyle}>
                    {t('fieldCiudad')}
                  </label>
                  <input
                    id="edit-ciudad"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    maxLength={80}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="edit-colonia" style={labelStyle}>
                    {t('fieldColonia')}
                  </label>
                  <input
                    id="edit-colonia"
                    value={colonia}
                    onChange={(e) => setColonia(e.target.value)}
                    maxLength={80}
                    style={inputStyle}
                  />
                </div>
              </div>
            </section>

            <section style={sectionStyle} aria-labelledby="edit-sec-operacion">
              <h3 id="edit-sec-operacion" style={sectionTitleStyle}>
                {t('sectionOperation')}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="edit-tipo" style={labelStyle}>
                    {t('fieldTipo')}
                  </label>
                  <select
                    id="edit-tipo"
                    value={tipoOperacion}
                    onChange={(e) => setTipoOperacion(e.target.value as 'venta' | 'renta')}
                    style={inputStyle}
                  >
                    <option value="venta">{t('tipoOption.venta')}</option>
                    <option value="renta">{t('tipoOption.renta')}</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label htmlFor="edit-precio" style={labelStyle}>
                    {t('fieldPrecio')}
                  </label>
                  <input
                    id="edit-precio"
                    type="number"
                    min={1}
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
                  />
                </div>
              </div>
            </section>

            <section style={sectionStyle} aria-labelledby="edit-sec-notas">
              <h3 id="edit-sec-notas" style={sectionTitleStyle}>
                {t('sectionNotes')}
              </h3>
              <DisclosurePill tone="amber">{tDisc('stubNotasDetalle')}</DisclosurePill>
              <label htmlFor="edit-notes" style={labelStyle}>
                {t('fieldNotes')}
              </label>
              <textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                maxLength={4000}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
              />
            </section>

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
          </div>

          <footer
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              padding: '14px 24px',
              borderTop: '1px solid var(--canon-border)',
            }}
          >
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
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!isValid || update.isPending}
              style={{
                padding: '10px 22px',
                borderRadius: 'var(--canon-radius-pill)',
                background: isValid
                  ? 'var(--mod-captaciones, var(--canon-gradient))'
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
              {update.isPending ? t('submitting') : t('submit')}
            </button>
          </footer>
        </form>
      </div>
    </>
  );
}
