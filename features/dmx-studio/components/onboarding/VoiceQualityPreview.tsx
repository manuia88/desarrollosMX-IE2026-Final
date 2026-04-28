'use client';

// FASE 14.F.2 Sprint 1 — Voice quality preview (3 muestras pre-grabadas ES-MX).
// STUB ADR-018 — sample mp3 no existen aun, founder genera + uploads via service_role.
// L-NEW-STUDIO-VOICE-PREVIEW-SAMPLES H2: generar 3 .mp3 vía ElevenLabs API
// server-side + servir desde Supabase Storage bucket `studio-voice-previews` (público).
// VoiceQualityPreview muestra disclosure "Próximamente" cuando el archivo no carga.
// F14.F.14 hotfix2: source of truth en ELEVENLABS_CANON_VOICES_ES_MX (voices-canon.ts).

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';

interface VoiceSample {
  readonly id: string;
  readonly nameKey: string;
  readonly toneKey: string;
  readonly audioUrl: string;
}

import { ELEVENLABS_CANON_VOICES_ES_MX } from '@/features/dmx-studio/lib/elevenlabs/voices-canon';

const VOICE_KEY_BY_NAME: Record<string, { nameKey: string; toneKey: string }> = {
  'Aurora MX': { nameKey: 'voicePreview.aurora.name', toneKey: 'voicePreview.aurora.tone' },
  'Mateo MX': { nameKey: 'voicePreview.mateo.name', toneKey: 'voicePreview.mateo.tone' },
  'Sofía MX': { nameKey: 'voicePreview.sofia.name', toneKey: 'voicePreview.sofia.tone' },
};

const VOICE_SAMPLES: ReadonlyArray<VoiceSample> = ELEVENLABS_CANON_VOICES_ES_MX.map((v) => ({
  id: v.id,
  nameKey: VOICE_KEY_BY_NAME[v.name]?.nameKey ?? 'voicePreview.aurora.name',
  toneKey: VOICE_KEY_BY_NAME[v.name]?.toneKey ?? 'voicePreview.aurora.tone',
  audioUrl: v.samplePreviewUrl,
}));

export const VOICE_PREVIEW_SAMPLE_IDS = VOICE_SAMPLES.map((v) => v.id);

export function VoiceQualityPreview() {
  const t = useTranslations('Studio.onboarding');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [unavailableIds, setUnavailableIds] = useState<ReadonlySet<string>>(() => new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const markUnavailable = useCallback((id: string) => {
    setUnavailableIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const togglePlay = useCallback(
    (sample: VoiceSample) => {
      if (typeof window === 'undefined') return;
      if (unavailableIds.has(sample.id)) return;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (playingId === sample.id) {
        setPlayingId(null);
        return;
      }
      const audio = new Audio(sample.audioUrl);
      audioRef.current = audio;
      audio.addEventListener('ended', () => setPlayingId(null), { once: true });
      audio.addEventListener(
        'error',
        () => {
          markUnavailable(sample.id);
          setPlayingId(null);
        },
        { once: true },
      );
      audio.play().catch(() => {
        markUnavailable(sample.id);
        setPlayingId(null);
      });
      setPlayingId(sample.id);
    },
    [playingId, unavailableIds, markUnavailable],
  );

  return (
    <section
      aria-label={t('voicePreviewTitle')}
      className="flex flex-col gap-3"
      data-stub="studio-voice-preview"
    >
      <header className="flex flex-col gap-1">
        <h3
          className="font-[var(--font-display)] text-[15px] font-bold"
          style={{ color: '#FFFFFF' }}
        >
          {t('voicePreviewTitle')}
        </h3>
        <p className="text-[12.5px]" style={{ color: 'var(--canon-cream-2)' }}>
          {t('voicePreviewHelp')}
        </p>
      </header>
      <ul className="flex flex-col gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {VOICE_SAMPLES.map((sample) => {
          const isPlaying = playingId === sample.id;
          const isUnavailable = unavailableIds.has(sample.id);
          return (
            <li key={sample.id}>
              <button
                type="button"
                onClick={() => togglePlay(sample)}
                aria-pressed={isPlaying}
                aria-disabled={isUnavailable}
                aria-label={`${t(sample.nameKey)} — ${t(sample.toneKey)}`}
                disabled={isUnavailable}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                style={{
                  background: isPlaying ? 'var(--surface-spotlight)' : 'var(--surface-recessed)',
                  border: '1px solid var(--canon-border)',
                  borderRadius: 'var(--canon-radius-pill)',
                  color: 'var(--canon-cream)',
                  cursor: isUnavailable ? 'not-allowed' : 'pointer',
                  opacity: isUnavailable ? 0.6 : 1,
                  transition: 'background-color var(--canon-duration-fast) var(--canon-ease-out)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--canon-radius-pill)',
                    background: isPlaying ? 'var(--gradient-ai)' : 'rgba(99,102,241,0.12)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                  }}
                >
                  {isPlaying ? '||' : '>'}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{t(sample.nameKey)}</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--canon-cream-2)' }}>
                    {isUnavailable ? t('voicePreviewComingSoon') : t(sample.toneKey)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
