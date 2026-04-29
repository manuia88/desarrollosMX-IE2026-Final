'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef, useState } from 'react';
import { DOC_TYPE, type DocType } from '@/features/document-intel/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface UploadDocumentModalProps {
  readonly open: boolean;
  readonly projects: ReadonlyArray<{ id: string; nombre: string }>;
  readonly onClose: () => void;
  readonly onUploaded: () => void;
}

export function UploadDocumentModal({
  open,
  projects,
  onClose,
  onUploaded,
}: UploadDocumentModalProps) {
  const t = useTranslations('dev.documents.upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>('lista_precios');
  const [proyectoId, setProyectoId] = useState<string>('');
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing'>('idle');
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const uploadSigned = trpc.documentIntel.uploadDocumentToStorage.useMutation();
  const createJob = trpc.documentIntel.createJob.useMutation();
  const requestExtraction = trpc.documentIntel.requestExtraction.useMutation();

  const reset = useCallback(() => {
    setFile(null);
    setDocType('lista_precios');
    setProyectoId('');
    setPhase('idle');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!file) return;
    setError(null);
    setPhase('uploading');
    try {
      const signed = await uploadSigned.mutateAsync({
        file_name: file.name,
        doc_type: docType,
        ...(proyectoId ? { proyecto_id: proyectoId } : {}),
      });
      const buf = await file.arrayBuffer();
      const putRes = await fetch(signed.signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/pdf' },
        body: buf,
      });
      if (!putRes.ok) {
        throw new Error(`upload_http_${putRes.status}`);
      }
      const job = await createJob.mutateAsync({
        doc_type: docType,
        storage_path: signed.storage_path,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || 'application/pdf',
        visibility: 'dev_only',
        ...(proyectoId ? { proyecto_id: proyectoId } : {}),
      });
      setPhase('processing');
      await requestExtraction.mutateAsync({ jobId: job.id });
      await utils.documentIntel.listMyJobs.invalidate();
      onUploaded();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload_failed');
      setPhase('idle');
    }
  }, [
    file,
    docType,
    proyectoId,
    uploadSigned,
    createJob,
    requestExtraction,
    utils.documentIntel.listMyJobs,
    onUploaded,
    onClose,
    reset,
  ]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('modal_title')}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
      }}
    >
      <Card variant="elevated" className="w-full max-w-md p-6">
        <h2
          className="mb-4 text-base font-semibold"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('modal_title')}
        </h2>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
          className="block w-full rounded-md border-2 border-dashed p-6 text-center text-sm"
          style={{
            borderColor: 'var(--canon-border)',
            color: 'var(--canon-cream)',
            background: 'var(--canon-bg)',
            cursor: 'pointer',
          }}
          aria-label={t('drop_zone')}
        >
          {file ? file.name : t('drop_zone')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
        />

        <label
          htmlFor="upload-doc-type"
          className="mt-4 mb-1 block text-xs"
          style={{ color: 'var(--canon-cream)', opacity: 0.7 }}
        >
          {t('doc_type_label')}
        </label>
        <select
          id="upload-doc-type"
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocType)}
          className="w-full rounded-md p-2 text-sm"
          style={{
            background: 'var(--canon-bg)',
            border: '1px solid var(--canon-border)',
            color: 'var(--canon-cream)',
          }}
        >
          {DOC_TYPE.map((dt) => (
            <option key={dt} value={dt}>
              {dt}
            </option>
          ))}
        </select>

        <label
          htmlFor="upload-proyecto"
          className="mt-3 mb-1 block text-xs"
          style={{ color: 'var(--canon-cream)', opacity: 0.7 }}
        >
          {t('proyecto_label')}
        </label>
        <select
          id="upload-proyecto"
          value={proyectoId}
          onChange={(e) => setProyectoId(e.target.value)}
          className="w-full rounded-md p-2 text-sm"
          style={{
            background: 'var(--canon-bg)',
            border: '1px solid var(--canon-border)',
            color: 'var(--canon-cream)',
          }}
        >
          <option value="">—</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        {error ? (
          <p className="mt-3 text-xs" style={{ color: '#fca5a5' }}>
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="glass" size="sm" onClick={onClose} aria-label={t('cancel')}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!file || phase !== 'idle'}
            aria-label={t('submit')}
          >
            {phase === 'uploading'
              ? t('uploading')
              : phase === 'processing'
                ? t('processing')
                : t('submit')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
