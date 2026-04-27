'use client';

// FASE 14.F.2 Sprint 1 — Voice recorder (MediaRecorder browser API).
// Records 10-30s, stores Blob, exposes onCaptured callback.

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/ui/primitives/canon';

const MIN_DURATION_SEC = 10;
const MAX_DURATION_SEC = 30;

export interface VoiceRecorderProps {
  readonly onCaptured: (blob: Blob, durationSeconds: number) => void;
}

type RecorderState = 'idle' | 'recording' | 'captured' | 'error';

export function VoiceRecorder({ onCaptured }: VoiceRecorderProps) {
  const t = useTranslations('Studio.onboarding');
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (timerRef.current !== null && typeof window !== 'undefined') {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [stopStream, previewUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setSeconds(0);
    chunksRef.current = [];
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError(t('recorderUnsupported'));
      setState('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      });
      mr.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setState('captured');
        // Snapshot seconds at stop time via closure of latest state via setState callback.
        setSeconds((prevSeconds) => {
          onCaptured(blob, Math.max(prevSeconds, 1));
          return prevSeconds;
        });
        stopStream();
      });
      mr.start();
      setState('recording');
      if (typeof window !== 'undefined') {
        timerRef.current = window.setInterval(() => {
          setSeconds((s) => {
            const next = s + 1;
            if (next >= MAX_DURATION_SEC) {
              stopRecording();
            }
            return next;
          });
        }, 1000);
      }
    } catch {
      setError(t('recorderPermissionDenied'));
      setState('error');
      stopStream();
    }
  }, [t, onCaptured, stopRecording, stopStream]);

  const reset = useCallback(() => {
    setState('idle');
    setSeconds(0);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  const canStop = state === 'recording' && seconds >= MIN_DURATION_SEC;
  const isRecording = state === 'recording';
  const hasCaptured = state === 'captured' && previewUrl;

  return (
    <section
      aria-label={t('recorderLabel')}
      className="flex flex-col gap-3 p-4"
      style={{
        background: 'var(--surface-recessed)',
        border: '1px solid var(--canon-border)',
        borderRadius: 'var(--canon-radius-card)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium" style={{ color: 'var(--canon-cream)' }}>
          {t('recorderLabel')}
        </span>
        <span
          className="text-[13px] tabular-nums"
          style={{ color: isRecording ? '#FCA5A5' : 'var(--canon-cream-2)' }}
          aria-live="polite"
        >
          {seconds}s / {MAX_DURATION_SEC}s
        </span>
      </div>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '8px 12px',
            background: 'rgba(244,63,94,0.10)',
            border: '1px solid rgba(244,63,94,0.30)',
            borderRadius: 'var(--canon-radius-pill)',
            fontSize: '12.5px',
            color: '#FCA5A5',
          }}
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {state === 'idle' && (
          <Button type="button" variant="primary" size="md" onClick={startRecording}>
            {t('recordButton')}
          </Button>
        )}
        {isRecording && (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={stopRecording}
            disabled={!canStop}
            aria-disabled={!canStop}
          >
            {canStop
              ? t('stopButton')
              : t('stopButtonWaiting', { remaining: Math.max(0, MIN_DURATION_SEC - seconds) })}
          </Button>
        )}
        {hasCaptured && (
          <Button type="button" variant="glass" size="md" onClick={reset}>
            {t('recordAgainButton')}
          </Button>
        )}
        {state === 'error' && (
          <Button type="button" variant="glass" size="md" onClick={reset}>
            {t('recordAgainButton')}
          </Button>
        )}
      </div>

      {hasCaptured && previewUrl && (
        // biome-ignore lint/a11y/useMediaCaption: Captura de voz del propio asesor (no audio externo). Adjuntar track sin contenido sería ruido para screen readers.
        <audio controls aria-label={t('playButton')} src={previewUrl} style={{ width: '100%' }} />
      )}
    </section>
  );
}
