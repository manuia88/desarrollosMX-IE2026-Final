'use client';

// F14.F.6 Sprint 5 BIBLIA Tarea 5.2 — Transcription viewer con seek-on-click.

import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

export interface TranscriptionViewerProps {
  readonly rawVideoId: string;
  readonly onSeek?: (timestampMs: number) => void;
}

interface WordRecord {
  word: string;
  start: number;
  end: number;
  punctuated_word?: string;
}

interface TranscriptionShape {
  transcript?: string;
  words?: WordRecord[];
}

export function TranscriptionViewer({ rawVideoId, onSeek }: TranscriptionViewerProps) {
  const query = trpc.studio.rawVideoPipeline.getTranscription.useQuery({ rawVideoId });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (query.isLoading) return <div role="status">Cargando transcripción...</div>;
  if (query.error) {
    return (
      <div role="alert" style={{ color: 'var(--canon-red)' }}>
        {query.error.message}
      </div>
    );
  }

  const data = query.data as { status: string; transcription: unknown } | undefined;
  if (!data) return null;
  if (data.status !== 'completed' || !data.transcription) {
    return (
      <div style={{ color: 'var(--canon-cream-2)', fontSize: '14px' }}>
        Estado: {data.status}. Espera a que termine la transcripción.
      </div>
    );
  }

  const transcription = (data.transcription as TranscriptionShape | null) ?? {};
  const words: WordRecord[] = transcription.words ?? [];

  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--canon-radius-card)',
        padding: '20px',
        maxHeight: '480px',
        overflowY: 'auto',
        lineHeight: 1.8,
      }}
    >
      {words.length === 0 ? (
        <p>{transcription.transcript ?? ''}</p>
      ) : (
        <p>
          {words.map((w, idx) => (
            <button
              key={`w-${w.start}-${w.end}-${w.word}`}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                onSeek?.(Math.round(w.start * 1000));
              }}
              style={{
                background: idx === activeIdx ? 'rgba(45, 212, 191, 0.20)' : 'transparent',
                border: 'none',
                color: 'var(--canon-cream)',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                margin: '0 1px',
                fontSize: '14px',
              }}
              aria-label={`Saltar a ${w.start.toFixed(1)} segundos`}
            >
              {w.punctuated_word ?? w.word}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}
