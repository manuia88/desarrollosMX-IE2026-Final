'use client';

// F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — Polling progress tracker.

import { trpc } from '@/shared/lib/trpc/client';

export interface UploadProgressTrackerProps {
  readonly rawVideoId: string;
}

export function UploadProgressTracker({ rawVideoId }: UploadProgressTrackerProps) {
  const query = trpc.studio.rawVideos.getById.useQuery(
    { id: rawVideoId },
    { refetchInterval: 3000 },
  );

  if (query.isLoading) return <div role="status">Cargando estado...</div>;
  if (query.error) {
    return (
      <div role="alert" style={{ color: 'var(--canon-red)' }}>
        Error: {query.error.message}
      </div>
    );
  }

  const video = query.data;
  if (!video) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: '16px',
        borderRadius: 'var(--canon-radius-inner)',
        background: 'var(--surface-elevated)',
      }}
    >
      <p style={{ fontSize: '14px', color: 'var(--canon-cream)', fontWeight: 600 }}>
        Estado: {video.transcription_status}
      </p>
      {video.audio_extract_storage_path ? (
        <p style={{ fontSize: '12px', color: 'var(--canon-cream-2)', marginTop: '4px' }}>
          ✓ Audio extraído
        </p>
      ) : (
        <p style={{ fontSize: '12px', color: 'var(--canon-cream-2)', marginTop: '4px' }}>
          ⏳ Procesando audio...
        </p>
      )}
      {video.transcription_status === 'completed' ? (
        <p style={{ fontSize: '12px', color: 'var(--accent-teal)', marginTop: '4px' }}>
          ✓ Transcripción lista
        </p>
      ) : null}
    </div>
  );
}
