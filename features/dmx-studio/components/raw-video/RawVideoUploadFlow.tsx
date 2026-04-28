'use client';

// F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — Upload flow orchestrator.

import { useCallback, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';
import { UploadProgressTracker } from './UploadProgressTracker';
import { VideoFileUploader } from './VideoFileUploader';

export interface RawVideoUploadFlowProps {
  readonly locale: string;
  readonly fromOperacionId?: string;
}

type Step = 'idle' | 'uploading' | 'tracking' | 'error';

export function RawVideoUploadFlow({ locale: _locale, fromOperacionId }: RawVideoUploadFlowProps) {
  const [step, setStep] = useState<Step>('idle');
  const [rawVideoId, setRawVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = trpc.studio.rawVideos.upload.useMutation();

  const handleFile = useCallback(
    async (file: File) => {
      setStep('uploading');
      setError(null);
      try {
        const placeholderPath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const result = await uploadMutation.mutateAsync({
          sourceStoragePath: placeholderPath,
          fileSizeBytes: file.size,
          mimeType: file.type as 'video/mp4' | 'video/quicktime',
          ...(fromOperacionId ? {} : {}),
        });
        setRawVideoId(result.rawVideoId);
        setStep('tracking');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'upload failed');
        setStep('error');
      }
    },
    [uploadMutation, fromOperacionId],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <header>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '28px',
            color: 'var(--canon-cream)',
          }}
        >
          Subir video crudo
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--canon-cream-2)', marginTop: '8px' }}>
          Studio limpia automáticamente con IA: cortes filler/silencio + subtítulos.
        </p>
      </header>

      {step === 'idle' && <VideoFileUploader onFileSelected={handleFile} />}

      {step === 'uploading' && (
        <div role="status">
          <p style={{ color: 'var(--canon-cream)' }}>Subiendo...</p>
        </div>
      )}

      {step === 'tracking' && rawVideoId && <UploadProgressTracker rawVideoId={rawVideoId} />}

      {step === 'error' && error && (
        <div
          role="alert"
          style={{
            color: 'var(--canon-red)',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.10)',
            borderRadius: 'var(--canon-radius-inner)',
          }}
        >
          {error}
          <div style={{ marginTop: '12px' }}>
            <Button variant="ghost" size="sm" onClick={() => setStep('idle')}>
              Reintentar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
