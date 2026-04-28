'use client';

// FASE 14.F.2 Sprint 1 — Onboarding Step 2: voice preference (3 opciones canon).
// F14.F.14 hotfix2: voice clone OPCIONAL. 3 cards canon ADR-050:
//   A) Clone (graba 30s + IVC, gated ELEVENLABS_VOICE_CLONE_ENABLED)
//   B) Prebuilt (default, selecciona Aurora/Mateo/Sofia)
//   C) None (sin narracion, musica ambiente only)
// Step 2 ya NO bloquea avance — Opcion B/C completan onboarding sin grabacion.

import { useTranslations } from 'next-intl';
import { useCallback, useId, useMemo, useState } from 'react';
import { ELEVENLABS_CANON_VOICES_ES_MX } from '@/features/dmx-studio/lib/elevenlabs/voices-canon';
import { FEATURE_FLAGS } from '@/features/dmx-studio/lib/feature-flags';
import type { VoicePreference } from '@/features/dmx-studio/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { VoiceQualityPreview } from './VoiceQualityPreview';
import { VoiceRecorder } from './VoiceRecorder';

const CLONE_ENABLED = FEATURE_FLAGS.ELEVENLABS_VOICE_CLONE_ENABLED;

export interface OnboardingStep2VoiceDoneInput {
  readonly voicePreference: VoicePreference;
  readonly voiceCloneId: string | null;
  readonly selectedPrebuiltVoiceId: string | null;
  readonly voiceSampleStoragePath: string | null;
}

export interface OnboardingStep2VoiceProps {
  readonly onDone: (result: OnboardingStep2VoiceDoneInput) => void;
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

function OptionCard({
  selected,
  disabled,
  title,
  description,
  badge,
  onSelect,
}: {
  readonly selected: boolean;
  readonly disabled?: boolean;
  readonly title: string;
  readonly description: string;
  readonly badge?: string;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled ?? false}
      aria-pressed={selected}
      aria-disabled={disabled ?? false}
      style={{
        textAlign: 'left',
        padding: '16px 18px',
        background: selected ? 'var(--surface-spotlight)' : 'var(--surface-recessed)',
        border: selected ? '1px solid var(--canon-indigo-2)' : '1px solid var(--canon-border)',
        borderRadius: 'var(--canon-radius-md)',
        color: 'var(--canon-cream)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color var(--canon-duration-fast) var(--canon-ease-out)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#FFFFFF' }}>{title}</span>
        {badge && (
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 8px',
              background: 'var(--gradient-ai)',
              color: '#FFFFFF',
              borderRadius: 'var(--canon-radius-pill)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {badge}
          </span>
        )}
      </span>
      <span style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--canon-cream-2)' }}>
        {description}
      </span>
    </button>
  );
}

export function OnboardingStep2Voice({ onDone }: OnboardingStep2VoiceProps) {
  const t = useTranslations('Studio.onboarding');
  const formId = useId();
  const [voicePreference, setVoicePreference] = useState<VoicePreference>('prebuilt');
  const [selectedPrebuiltVoiceId, setSelectedPrebuiltVoiceId] = useState<string>(
    ELEVENLABS_CANON_VOICES_ES_MX[0]?.id ?? '',
  );
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

      try {
        if (voicePreference === 'clone') {
          if (!CLONE_ENABLED) {
            setServerError(t('voiceCloneGatedError'));
            return;
          }
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
            voicePreference: 'clone',
            voiceSampleStoragePath: signed.path,
            voiceLanguage: 'es-MX',
            voiceName: voiceName.trim(),
            consentSigned: true,
          });
          onDone({
            voicePreference: 'clone',
            voiceCloneId: result.voiceCloneId,
            selectedPrebuiltVoiceId: null,
            voiceSampleStoragePath: signed.path,
          });
          return;
        }

        if (voicePreference === 'prebuilt') {
          if (!selectedPrebuiltVoiceId) {
            setServerError(t('errorNoPrebuiltVoice'));
            return;
          }
          setUploading(true);
          const result = await completeStep2.mutateAsync({
            voicePreference: 'prebuilt',
            selectedPrebuiltVoiceId,
          });
          onDone({
            voicePreference: 'prebuilt',
            voiceCloneId: null,
            selectedPrebuiltVoiceId: result.selectedPrebuiltVoiceId ?? selectedPrebuiltVoiceId,
            voiceSampleStoragePath: null,
          });
          return;
        }

        setUploading(true);
        await completeStep2.mutateAsync({ voicePreference: 'none' });
        onDone({
          voicePreference: 'none',
          voiceCloneId: null,
          selectedPrebuiltVoiceId: null,
          voiceSampleStoragePath: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        setServerError(msg);
      } finally {
        setUploading(false);
      }
    },
    [
      voicePreference,
      captured,
      voiceName,
      consent,
      selectedPrebuiltVoiceId,
      uploadVoiceSample,
      completeStep2,
      onDone,
      t,
    ],
  );

  const isBusy = uploading || uploadVoiceSample.isPending || completeStep2.isPending;
  const isReady = useMemo(() => {
    if (voicePreference === 'clone') {
      return CLONE_ENABLED && Boolean(captured) && consent && voiceName.trim().length > 0;
    }
    if (voicePreference === 'prebuilt') {
      return Boolean(selectedPrebuiltVoiceId);
    }
    return true;
  }, [voicePreference, captured, consent, voiceName, selectedPrebuiltVoiceId]);

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

        <fieldset
          aria-label={t('voiceOptionsLabel')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          <OptionCard
            selected={voicePreference === 'prebuilt'}
            title={t('voiceOption.prebuilt.title')}
            description={t('voiceOption.prebuilt.description')}
            onSelect={() => setVoicePreference('prebuilt')}
          />
          <OptionCard
            selected={voicePreference === 'clone'}
            title={t('voiceOption.clone.title')}
            description={
              CLONE_ENABLED
                ? t('voiceOption.clone.description')
                : t('voiceOption.clone.gatedDescription')
            }
            badge={t('voiceOption.clone.badge')}
            onSelect={() => setVoicePreference('clone')}
          />
          <OptionCard
            selected={voicePreference === 'none'}
            title={t('voiceOption.none.title')}
            description={t('voiceOption.none.description')}
            onSelect={() => setVoicePreference('none')}
          />
        </fieldset>

        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          aria-label={t('step2Title')}
          style={{ display: 'grid', gap: '16px' }}
        >
          {voicePreference === 'prebuilt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <VoiceQualityPreview />
              <div style={{ display: 'grid', gap: '6px' }}>
                <label htmlFor={`${formId}-prebuilt-voice`} style={labelStyle}>
                  {t('selectedPrebuiltVoiceLabel')}
                </label>
                <select
                  id={`${formId}-prebuilt-voice`}
                  value={selectedPrebuiltVoiceId}
                  onChange={(e) => setSelectedPrebuiltVoiceId(e.target.value)}
                  style={inputStyle}
                >
                  {ELEVENLABS_CANON_VOICES_ES_MX.map((v) => (
                    <option key={v.id} value={v.id} style={{ color: '#000' }}>
                      {v.name} — {v.tone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {voicePreference === 'clone' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!CLONE_ENABLED && (
                <p
                  role="status"
                  data-stub="studio-voice-clone-gated"
                  style={{
                    margin: 0,
                    padding: '10px 14px',
                    background: 'rgba(99,102,241,0.10)',
                    border: '1px solid rgba(99,102,241,0.30)',
                    borderRadius: 'var(--canon-radius-pill)',
                    fontSize: '12.5px',
                    color: 'var(--canon-cream-2)',
                  }}
                >
                  {t('voiceCloneGatedDisclosure')}
                </p>
              )}
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
            </div>
          )}

          {voicePreference === 'none' && (
            <p
              role="status"
              style={{
                margin: 0,
                padding: '10px 14px',
                background: 'var(--surface-recessed)',
                border: '1px solid var(--canon-border)',
                borderRadius: 'var(--canon-radius-pill)',
                fontSize: '13px',
                color: 'var(--canon-cream-2)',
              }}
            >
              {t('voiceOption.none.helper')}
            </p>
          )}

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
