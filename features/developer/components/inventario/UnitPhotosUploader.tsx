'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useId, useRef, useState } from 'react';
import { uploadInventoryPhoto } from '@/features/developer/lib/upload-inventory-photo';
import { trpc } from '@/shared/lib/trpc/client';

interface UnitPhotosUploaderProps {
  unidadId: string;
  proyectoId: string;
  photos: ReadonlyArray<string>;
  onChanged: () => void;
}

export function UnitPhotosUploader({
  unidadId,
  proyectoId,
  photos,
  onChanged,
}: UnitPhotosUploaderProps) {
  const t = useTranslations('dev.inventario.info.photos');
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const dragSrcIdx = useRef<number | null>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reorderMut = trpc.developer.inventarioReorderPhotos.useMutation();
  const removeMut = trpc.developer.inventarioRemovePhoto.useMutation();

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      setUploading(files.length);
      try {
        for (const file of Array.from(files)) {
          await uploadInventoryPhoto({ file, proyectoId, unidadId });
        }
        onChanged();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'upload_failed');
      } finally {
        setUploading(0);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [proyectoId, unidadId, onChanged],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleRemove = useCallback(
    async (url: string) => {
      await removeMut.mutateAsync({ unidadId, photoUrl: url });
      onChanged();
    },
    [removeMut, unidadId, onChanged],
  );

  const handleMakeMain = useCallback(
    async (url: string) => {
      const next = [url, ...photos.filter((p) => p !== url)];
      await reorderMut.mutateAsync({ unidadId, photos: next });
      onChanged();
    },
    [reorderMut, unidadId, photos, onChanged],
  );

  const handleDragStart = (idx: number) => {
    dragSrcIdx.current = idx;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDropReorder = useCallback(
    async (idx: number) => {
      const src = dragSrcIdx.current;
      dragSrcIdx.current = null;
      if (src == null || src === idx) return;
      const next = [...photos];
      const [moved] = next.splice(src, 1);
      if (moved) next.splice(idx, 0, moved);
      await reorderMut.mutateAsync({ unidadId, photos: next });
      onChanged();
    },
    [photos, reorderMut, unidadId, onChanged],
  );

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-amber-200/80">{t('stubBanner')}</p>
      <label
        htmlFor={inputId}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-white/60 transition-colors hover:border-violet-400/40 hover:bg-white/[0.05]"
      >
        <span>{t('uploadCta')}</span>
        <span className="text-[10px] text-white/40">{t('maxSize')}</span>
        {uploading > 0 ? (
          <span className="text-xs text-violet-300">
            {t('uploadingLabel', { count: uploading })}
          </span>
        ) : null}
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      {photos.length > 0 ? (
        <>
          <p className="text-[11px] text-white/40">{t('reorderHint')}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((url, idx) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: drag-reorder UX requires div + drag handlers
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: composite key url+idx; positional drag-reorder requires index
                key={`${url}-${idx}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDrop={() => handleDropReorder(idx)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]"
              >
                {/* biome-ignore lint/performance/noImgElement: user-uploaded photo with unknown dimensions */}
                <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                {idx === 0 ? (
                  <span className="absolute left-1 top-1 rounded-full bg-violet-600/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                    {t('mainBadge')}
                  </span>
                ) : null}
                <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {idx !== 0 ? (
                    <button
                      type="button"
                      onClick={() => handleMakeMain(url)}
                      className="rounded-full bg-zinc-900/80 px-2 py-0.5 text-[10px] text-white"
                    >
                      {t('makeMain')}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(url)}
                    aria-label={t('removePhoto')}
                    className="rounded-full bg-rose-600/85 px-2 py-0.5 text-[10px] text-white"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
