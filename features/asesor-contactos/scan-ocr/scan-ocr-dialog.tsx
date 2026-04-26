'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { parseBusinessCardText, parseIneText } from './parse-ine';

interface ScanOcrDialogProps {
  onClose: () => void;
}

type ScanMode = 'ine' | 'business_card';
type ScanState = 'idle' | 'loading' | 'recognizing' | 'parsed' | 'error';

interface OcrResult {
  rawText: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  curp: string | null;
  birthdate: string | null;
  address: string | null;
}

export function ScanOcrDialog({ onClose }: ScanOcrDialogProps) {
  const t = useTranslations('AsesorContactos.scanOcr');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<ScanMode>('business_card');
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<OcrResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFile = async (file: File) => {
    setState('loading');
    setErrorMsg(null);
    try {
      const tesseract = await import('tesseract.js').catch(() => null);
      if (!tesseract) {
        setErrorMsg(t('errorMissingTesseract'));
        setState('error');
        return;
      }
      setState('recognizing');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('file_read_failed'));
        reader.readAsDataURL(file);
      });
      const recognition = await tesseract.recognize(dataUrl, mode === 'ine' ? 'spa' : 'eng+spa', {
        logger: (msg) => {
          if (typeof msg === 'object' && msg !== null && 'progress' in msg) {
            const m = msg as { progress?: number };
            setProgress(Math.round((m.progress ?? 0) * 100));
          }
        },
      });
      const text = recognition.data?.text ?? '';
      if (mode === 'ine') {
        const parsed = parseIneText(text);
        setResult({
          rawText: text,
          fullName: parsed.fullName,
          email: null,
          phone: null,
          company: null,
          curp: parsed.curp,
          birthdate: parsed.birthdate,
          address: parsed.address,
        });
      } else {
        const parsed = parseBusinessCardText(text);
        setResult({
          rawText: text,
          fullName: parsed.fullName,
          email: parsed.email,
          phone: parsed.phone,
          company: parsed.company,
          curp: null,
          birthdate: null,
          address: null,
        });
      }
      setState('parsed');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'unknown_error');
      setState('error');
    }
  };

  const fileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await handleFile(file);
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: ESC handler attached at window via useEffect.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('dialogAria')}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,10,18,0.65)',
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        style={{
          width: 'min(560px, 100%)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--canon-border)',
          borderRadius: 'var(--canon-radius-lg)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <header>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--canon-cream)',
              margin: 0,
            }}
          >
            {t('dialogTitle')}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--canon-cream-2)', margin: '4px 0 0' }}>
            {t('dialogSubtitle')}
          </p>
        </header>

        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', gap: 6 }}>
          <legend
            style={{ fontSize: 11, color: 'var(--canon-cream-3)', textTransform: 'uppercase' }}
          >
            {t('modeLegend')}
          </legend>
          {(['business_card', 'ine'] as const).map((value) => {
            const active = mode === value;
            return (
              <label
                key={value}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--canon-radius-pill)',
                  border: '1px solid var(--canon-border)',
                  background: active ? 'var(--accent-violet-soft)' : 'transparent',
                  color: active ? 'var(--canon-cream)' : 'var(--canon-cream-2)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="ocr-mode"
                  value={value}
                  checked={active}
                  onChange={() => setMode(value)}
                  style={{ display: 'none' }}
                />
                {t(`modes.${value}`)}
              </label>
            );
          })}
        </fieldset>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={fileChange}
          aria-label={t('fileInputAria')}
          style={{
            padding: 12,
            borderRadius: 'var(--canon-radius-md)',
            border: '1px dashed var(--canon-border-2)',
            background: 'var(--surface-recessed)',
            color: 'var(--canon-cream-2)',
            cursor: 'pointer',
          }}
        />

        {state === 'recognizing' || state === 'loading' ? (
          <p style={{ fontSize: 12, color: 'var(--canon-cream-2)' }}>
            {t('recognizing', { progress })}
          </p>
        ) : null}

        {state === 'error' && errorMsg ? (
          <p role="alert" style={{ fontSize: 12, color: '#fb7185', margin: 0 }}>
            {errorMsg}
          </p>
        ) : null}

        {state === 'parsed' && result ? (
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 6,
              fontSize: 13,
              color: 'var(--canon-cream)',
            }}
          >
            <dt style={{ color: 'var(--canon-cream-3)' }}>{t('result.fullName')}</dt>
            <dd style={{ margin: 0 }}>{result.fullName ?? '—'}</dd>
            {mode === 'business_card' ? (
              <>
                <dt style={{ color: 'var(--canon-cream-3)' }}>{t('result.email')}</dt>
                <dd style={{ margin: 0 }}>{result.email ?? '—'}</dd>
                <dt style={{ color: 'var(--canon-cream-3)' }}>{t('result.phone')}</dt>
                <dd style={{ margin: 0 }}>{result.phone ?? '—'}</dd>
                <dt style={{ color: 'var(--canon-cream-3)' }}>{t('result.company')}</dt>
                <dd style={{ margin: 0 }}>{result.company ?? '—'}</dd>
              </>
            ) : (
              <>
                <dt style={{ color: 'var(--canon-cream-3)' }}>{t('result.curp')}</dt>
                <dd style={{ margin: 0 }}>{result.curp ?? '—'}</dd>
                <dt style={{ color: 'var(--canon-cream-3)' }}>{t('result.birthdate')}</dt>
                <dd style={{ margin: 0 }}>{result.birthdate ?? '—'}</dd>
                <dt style={{ color: 'var(--canon-cream-3)' }}>{t('result.address')}</dt>
                <dd style={{ margin: 0 }}>{result.address ?? '—'}</dd>
              </>
            )}
          </dl>
        ) : null}

        <p style={{ fontSize: 11, color: 'var(--canon-cream-3)', margin: 0 }}>
          {t('disclosureLocal')}
        </p>

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--canon-radius-pill)',
              border: '1px solid var(--canon-border-2)',
              background: 'transparent',
              color: 'var(--canon-cream-2)',
              cursor: 'pointer',
            }}
          >
            {t('close')}
          </button>
        </footer>
      </section>
    </div>
  );
}
