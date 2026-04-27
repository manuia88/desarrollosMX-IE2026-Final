'use client';

// FASE 14.F.2 Sprint 1 — Onboarding Step 2: voice sample.
// Flow: preview voces sample → record 10-30s → upload via signed URL → completeStep2.

import { useTranslations } from 'next-intl';
import { useCallback, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { VoiceQualityPreview } from './VoiceQualityPreview';
import { VoiceRecorder } from './VoiceRecorder';

export interface OnboardingStep2VoiceProps {
  readonly onDone: (voiceSampleStoragePath: string, voiceCloneId: string) => void;
}

interface CapturedVoice {
  readonly blob: Blob;
  readonly durationSeconds: number;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '42px',
  padding: '0 14px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.01em',
};

export function OnboardingStep2Voice({ onDone }: OnboardingStep2VoiceProps) {
  const t = useTranslations('Studio.onboarding');
  const formId = useId();
  const [captured, setCaptured] = useState<CapturedVoice | null>(null);
  const [voiceName, setVoiceName] = useState<string>('');
  const [consent, setConsent] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const uploadVoiceSample = trpc.studio.onboarding.uploadVoiceSample.useMutation();
  const completeStep2 = trpc.studio.onboarding.completeStep2.useMutation();

  const handleCaptured = useCallback((blob: Blob, durationSeconds: number) => {
    setCaptured({ blob, durationSeconds });
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setServerError(null);
      if (!captured) {
        setServerError(t('errorNoSample'));
        return;
      }
      if (!voiceName.trim()) {
        setServerError(t('errorVoiceName'));
        return;
      }
      if (!consent) {
        setServerError(t('errorConsent'));
        return;
      }
      try {
        setUploading(true);
        const fileName = `voice-sample-${Date.now()}.webm`;
        const contentType = captured.blob.type || 'audio/webm';
        const signed = await uploadVoiceSample.mutateAsync({
          fileName,
          contentType,
          durationSeconds: captured.durationSeconds,
        });
        const uploadRes = await fetch(signed.uploadUrl, {
          method: 'PUT',
          headers: { 'content-type': contentType },
          body: captured.blob,
        });
        if (!uploadRes.ok) throw new Error('upload-failed');

        const result = await completeStep2.mutateAsync({
          voiceSampleStoragePath: signed.path,
          voiceLanguage: 'es-MX',
          voiceName: voiceName.trim(),
          consentSigned: consent,
        });
        onDone(signed.path, result.voiceCloneId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        setServerError(msg);
      } finally {
        setUploading(false);
      }
    },
    [captured, voiceName, consent, uploadVoiceSample, completeStep2, onDone, t],
  );

  const isBusy = uploading || uploadVoiceSample.isPending || completeStep2.isPending;
  const isReady = Boolean(captured) && consent && voiceName.trim().length > 0;

  return (
    <FadeUp delay={0}>
      <Card variant="elevated" className="flex flex-col gap-5 p-8">
        <header className="flex flex-col gap-1">
          <h2 className="font-[var(--font-display)] text-xl font-bold" style={{ color: '#FFFFFF' }}>
            {t('step2Title')}
          </h2>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)' }}>
            {t('step2Subtitle')}
          </p>
        </header>

        <VoiceQualityPreview />

        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          aria-label={t('step2Title')}
          style={{ display: 'grid', gap: '16px' }}
        >
          <VoiceRecorder onCaptured={handleCaptured} />

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor={`${formId}-voice-name`} style={labelStyle}>
              {t('voiceNameLabel')}{' '}
              <span aria-hidden="true" style={{ color: 'var(--canon-indigo-2)' }}>
                *
              </span>
            </label>
            <input
              id={`${formId}-voice-name`}
              type="text"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              required
              aria-required="true"
              maxLength={80}
              placeholder={t('voiceNamePlaceholder')}
              style={inputStyle}
            />
          </div>

          <label
            htmlFor={`${formId}-consent`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '13px',
              color: 'var(--canon-cream-2)',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            <input
              id={`${formId}-consent`}
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              aria-required="true"
              style={{ marginTop: '3px' }}
            />
            <span>{t('voiceConsent')}</span>
          </label>

          {serverError && (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: '10px 14px',
                background: 'rgba(244,63,94,0.10)',
                border: '1px solid rgba(244,63,94,0.30)',
                borderRadius: 'var(--canon-radius-pill)',
                fontSize: '13px',
                color: '#FCA5A5',
              }}
            >
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isBusy || !isReady}
            aria-busy={isBusy}
          >
            {isBusy ? `${t('continueButton')}…` : t('continueButton')}
          </Button>
        </form>
      </Card>
    </FadeUp>
  );
}
