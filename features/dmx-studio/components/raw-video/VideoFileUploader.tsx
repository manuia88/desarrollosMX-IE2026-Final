'use client';

// F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — Drag-drop video uploader.

import { useCallback, useRef, useState } from 'react';
import {
  RAW_VIDEO_MAX_BYTES,
  RAW_VIDEO_MIME_TYPES,
} from '@/features/dmx-studio/lib/raw-video-uploader/constants';

export interface VideoFileUploaderProps {
  readonly onFileSelected: (file: File) => void | Promise<void>;
  readonly disabled?: boolean;
}

export function VideoFileUploader({ onFileSelected, disabled = false }: VideoFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!RAW_VIDEO_MIME_TYPES.includes(file.type as (typeof RAW_VIDEO_MIME_TYPES)[number])) {
        setError(`Formato no soportado. Usa MP4 o MOV.`);
        return;
      }
      if (file.size > RAW_VIDEO_MAX_BYTES) {
        setError(`Archivo muy grande. Máx ${(RAW_VIDEO_MAX_BYTES / 1024 / 1024).toFixed(0)}MB.`);
        return;
      }
      await onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: drag-drop wrapper requires div semantics; keyboard activation provided via onKeyDown + tabIndex.
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Seleccionar o arrastrar video"
      onDragEnter={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) await handleFile(file);
      }}
      style={{
        border: dragActive ? '2px dashed var(--accent-teal)' : '2px dashed var(--canon-cream-2)',
        background: dragActive ? 'rgba(45, 212, 191, 0.05)' : 'var(--surface-elevated)',
        borderRadius: 'var(--canon-radius-card)',
        padding: '48px 24px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 200ms ease',
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        style={{ display: 'none' }}
        disabled={disabled}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleFile(file);
        }}
        aria-label="Seleccionar video"
      />
      <p style={{ fontSize: '16px', color: 'var(--canon-cream)', fontWeight: 600 }}>
        Arrastra video aquí o haz clic
      </p>
      <p style={{ fontSize: '13px', color: 'var(--canon-cream-2)', marginTop: '8px' }}>
        MP4 o MOV. Máx {(RAW_VIDEO_MAX_BYTES / 1024 / 1024).toFixed(0)}MB.
      </p>
      {error ? (
        <p role="alert" style={{ color: 'var(--canon-red)', fontSize: '13px', marginTop: '12px' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
