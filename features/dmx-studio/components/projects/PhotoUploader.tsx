'use client';

// FASE 14.F.2 Sprint 1 — Photo uploader for new project flow.
// Drag-drop max 30 photos. Per-photo: signed URL → PUT → registerAsset →
// trigger Vision classify async (classifyAsset). Disclosure visible per
// ADR-050 R10 once classification arrives.

import { useTranslations } from 'next-intl';
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export const PHOTO_UPLOADER_MAX_PHOTOS = 30;
export const PHOTO_UPLOADER_MAX_BYTES = 25 * 1024 * 1024;
export const PHOTO_UPLOADER_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

export type PhotoUploaderItemStatus =
  | 'queued'
  | 'uploading'
  | 'registering'
  | 'classifying'
  | 'ready'
  | 'failed';

export interface PhotoUploaderItem {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly status: PhotoUploaderItemStatus;
  readonly orderIndex: number;
  readonly assetId: string | null;
  readonly storagePath: string | null;
  readonly spaceType: string | null;
  readonly confidence: number | null;
  readonly errorMessage: string | null;
}

export interface PhotoUploaderProps {
  readonly projectId: string | null;
  readonly items: readonly PhotoUploaderItem[];
  readonly onChange: (next: readonly PhotoUploaderItem[]) => void;
  readonly disabled?: boolean;
}

function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function PhotoUploader({
  projectId,
  items,
  onChange,
  disabled = false,
}: PhotoUploaderProps) {
  const t = useTranslations('Studio.projects.new');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemsRef = useRef<readonly PhotoUploaderItem[]>(items);
  itemsRef.current = items;
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);

  const signedUrlMutation = trpc.studio.projects.uploadAssetSignedUrl.useMutation();
  const registerAssetMutation = trpc.studio.projects.registerAsset.useMutation();
  const classifyAssetMutation = trpc.studio.projects.classifyAsset.useMutation();

  const updateItem = useCallback(
    (id: string, patch: Partial<PhotoUploaderItem>) => {
      const next = itemsRef.current.map((item) => (item.id === id ? { ...item, ...patch } : item));
      itemsRef.current = next;
      onChange(next);
    },
    [onChange],
  );

  const removeItem = useCallback(
    (id: string) => {
      const next = itemsRef.current.filter((item) => item.id !== id);
      const reindexed = next.map((item, idx) => ({ ...item, orderIndex: idx }));
      itemsRef.current = reindexed;
      onChange(reindexed);
    },
    [onChange],
  );

  const processFile = useCallback(
    async (item: PhotoUploaderItem) => {
      if (!projectId) {
        updateItem(item.id, {
          status: 'failed',
          errorMessage: t('errorPhotoRequired'),
        });
        return;
      }
      try {
        updateItem(item.id, { status: 'uploading' });
        const signed = await signedUrlMutation.mutateAsync({ projectId });
        const putRes = await fetch(signed.uploadUrl, {
          method: 'PUT',
          headers: { 'content-type': item.file.type || 'image/jpeg' },
          body: item.file,
        });
        if (!putRes.ok) throw new Error(`upload-failed:${putRes.status}`);

        updateItem(item.id, { status: 'registering', storagePath: signed.path });
        const registered = await registerAssetMutation.mutateAsync({
          projectId,
          storagePath: signed.path,
          fileName: item.file.name.slice(0, 200),
          mimeType: item.file.type || 'image/jpeg',
          sizeBytes: item.file.size,
          orderIndex: item.orderIndex,
        });

        updateItem(item.id, {
          status: 'classifying',
          assetId: registered.id,
        });

        const classified = await classifyAssetMutation
          .mutateAsync({ projectId, assetId: registered.id })
          .catch((err: unknown) => {
            return {
              ok: false as const,
              error: err instanceof Error ? err.message : 'classify-failed',
            };
          });

        if ('ok' in classified && classified.ok) {
          updateItem(item.id, {
            status: 'ready',
            spaceType: classified.spaceType,
            confidence: classified.confidence,
          });
        } else {
          updateItem(item.id, {
            status: 'ready',
            spaceType: null,
            confidence: null,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        updateItem(item.id, { status: 'failed', errorMessage: msg });
      }
    },
    [projectId, registerAssetMutation, signedUrlMutation, classifyAssetMutation, t, updateItem],
  );

  const enqueueFiles = useCallback(
    (files: readonly File[]) => {
      setRejectionMessage(null);
      const current = itemsRef.current;
      const remainingSlots = PHOTO_UPLOADER_MAX_PHOTOS - current.length;
      if (remainingSlots <= 0) {
        setRejectionMessage(t('photoRejectedMax'));
        return;
      }
      const next: PhotoUploaderItem[] = [...current];
      let lastReject: string | null = null;
      let added = 0;
      for (const file of files) {
        if (added >= remainingSlots) {
          lastReject = t('photoRejectedMax');
          break;
        }
        const isImage = file.type.startsWith('image/') || PHOTO_UPLOADER_ACCEPT.includes(file.type);
        if (!isImage) {
          lastReject = t('photoRejectedMime', { name: file.name });
          continue;
        }
        if (file.size > PHOTO_UPLOADER_MAX_BYTES) {
          lastReject = t('photoRejectedSize', { name: file.name });
          continue;
        }
        const item: PhotoUploaderItem = {
          id: generateLocalId(),
          file,
          previewUrl:
            typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '',
          status: 'queued',
          orderIndex: next.length,
          assetId: null,
          storagePath: null,
          spaceType: null,
          confidence: null,
          errorMessage: null,
        };
        next.push(item);
        added += 1;
      }
      if (lastReject) setRejectionMessage(lastReject);
      if (added > 0) {
        itemsRef.current = next;
        onChange(next);
        const newOnes = next.slice(current.length);
        for (const item of newOnes) {
          void processFile(item);
        }
      }
    },
    [onChange, processFile, t],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      enqueueFiles(Array.from(files));
      event.target.value = '';
    },
    [enqueueFiles],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const files = event.dataTransfer.files;
      if (!files || files.length === 0) return;
      enqueueFiles(Array.from(files));
    },
    [enqueueFiles],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePickClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handlePickKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handlePickClick();
      }
    },
    [handlePickClick],
  );

  const countLabel = useMemo(
    () => t('photoCount', { current: items.length, max: PHOTO_UPLOADER_MAX_PHOTOS }),
    [items.length, t],
  );

  return (
    <section
      aria-label={t('tabUploadTitle')}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: drop zone canon — semantic button conflicts with drag-drop event handlers and full-width hit area. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t('photoUploaderDragDrop')}
        aria-disabled={disabled}
        onClick={disabled ? undefined : handlePickClick}
        onKeyDown={disabled ? undefined : handlePickKeyDown}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        data-testid="photo-uploader-dropzone"
        data-dragging={isDragging ? 'true' : 'false'}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minHeight: '160px',
          padding: '24px',
          background: isDragging ? 'var(--surface-spotlight)' : 'var(--surface-recessed)',
          border: `1px dashed ${isDragging ? 'var(--canon-indigo-2)' : 'var(--canon-border)'}`,
          borderRadius: 'var(--canon-radius-card)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'background 200ms ease, border-color 200ms ease',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--canon-cream)',
            textAlign: 'center',
          }}
        >
          {t('photoUploaderDragDrop')}
        </span>
        <span style={{ fontSize: '12.5px', color: 'var(--canon-cream-2)', textAlign: 'center' }}>
          {t('photoUploaderHelp')}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--canon-cream-2)' }} aria-live="polite">
          {countLabel}
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={PHOTO_UPLOADER_ACCEPT.join(',')}
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          style={{ display: 'none' }}
          data-testid="photo-uploader-input"
        />
      </div>

      {rejectionMessage && (
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
          {rejectionMessage}
        </p>
      )}

      {items.length > 0 && (
        <ul
          aria-label={t('photoCount', { current: items.length, max: PHOTO_UPLOADER_MAX_PHOTOS })}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {items.map((item) => (
            <li
              key={item.id}
              data-testid={`photo-item-${item.orderIndex}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--canon-border)',
                borderRadius: 'var(--canon-radius-card)',
                padding: '8px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: '110px',
                  background: 'var(--canon-bg-2)',
                  borderRadius: 'var(--canon-radius-card)',
                  overflow: 'hidden',
                }}
              >
                {item.previewUrl && (
                  // biome-ignore lint/performance/noImgElement: object URL preview
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '6px',
                    left: '6px',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--canon-radius-pill)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.orderIndex + 1}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--canon-cream-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.file.name}
                </span>

                {item.status === 'uploading' && (
                  <span style={{ fontSize: '11.5px', color: 'var(--canon-indigo-3)' }}>
                    {t('photoUploading')}
                  </span>
                )}
                {item.status === 'classifying' && (
                  <span style={{ fontSize: '11.5px', color: 'var(--canon-indigo-3)' }}>
                    {t('photoClassifying')}
                  </span>
                )}
                {item.status === 'ready' && item.spaceType && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--canon-cream-2)' }}>
                      {t('photoSpaceTypeLabel')}:{' '}
                      <strong style={{ color: 'var(--canon-cream)' }}>{item.spaceType}</strong>
                    </span>
                    <DisclosurePill tone="violet">{t('photoAiClassifiedLabel')}</DisclosurePill>
                  </div>
                )}
                {item.status === 'ready' && !item.spaceType && (
                  <span style={{ fontSize: '11.5px', color: 'var(--canon-cream-2)' }}>
                    {t('photoUploaded')}
                  </span>
                )}
                {item.status === 'failed' && item.errorMessage && (
                  <span role="alert" style={{ fontSize: '11.5px', color: '#FCA5A5' }}>
                    {item.errorMessage}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={t('photoRemoveLabel')}
                disabled={disabled}
                style={{
                  appearance: 'none',
                  background: 'transparent',
                  border: '1px solid var(--canon-border)',
                  color: 'var(--canon-cream-2)',
                  borderRadius: 'var(--canon-radius-pill)',
                  height: '28px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {t('photoRemoveLabel')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
