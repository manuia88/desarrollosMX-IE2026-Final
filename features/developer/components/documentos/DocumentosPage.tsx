'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { uploadDocument } from '@/features/developer/lib/upload-document';
import { DOC_TIPOS, type DocTipo } from '@/features/developer/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

type Project = { id: string; nombre: string };

export type DocumentosPageProps = {
  readonly desarrolladoraId: string;
  readonly projects: ReadonlyArray<Project>;
};

export function DocumentosPage({ desarrolladoraId, projects }: DocumentosPageProps) {
  const t = useTranslations('dev.docs');
  const utils = trpc.useUtils();

  const [proyectoId, setProyectoId] = useState<string>(projects[0]?.id ?? '');
  const [tipo, setTipo] = useState<DocTipo>('planos');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const listQuery = trpc.developer.documentList.useQuery({ proyectoId: proyectoId || undefined });
  const createMutation = trpc.developer.documentCreate.useMutation({
    onSuccess: () => void utils.developer.documentList.invalidate(),
  });
  const deleteMutation = trpc.developer.documentDelete.useMutation({
    onSuccess: () => void utils.developer.documentList.invalidate(),
  });
  const signedUrlMutation = trpc.developer.documentSignedUrl.useMutation();

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !proyectoId) return;
      setUploading(true);
      setFeedback(null);
      try {
        for (const file of Array.from(files)) {
          const up = await uploadDocument({ desarrolladoraId, proyectoId, tipo, file });
          if (!up.ok) {
            setFeedback({ kind: 'err', msg: t('errors.uploadFailed', { reason: up.error }) });
            continue;
          }
          await createMutation.mutateAsync({
            proyectoId,
            tipo,
            nombre: file.name,
            storagePath: up.storagePath,
          });
        }
        setFeedback({ kind: 'ok', msg: t('uploaded') });
      } catch (err) {
        setFeedback({
          kind: 'err',
          msg: err instanceof Error ? err.message : t('errors.uploadFailed', { reason: 'unknown' }),
        });
      } finally {
        setUploading(false);
      }
    },
    [createMutation, desarrolladoraId, proyectoId, t, tipo],
  );

  const docs = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const openDoc = useCallback(
    async (documentId: string) => {
      const result = await signedUrlMutation.mutateAsync({ documentId, expiresIn: 600 });
      if (result?.signedUrl && typeof window !== 'undefined') {
        window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [signedUrlMutation],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
          >
            {t('title')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--canon-cream-2)' }}>
            {t('subtitle')}
          </p>
        </div>
      </header>

      <Card className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              {t('projectLabel')}
            </span>
            <select
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--canon-cream)',
              }}
            >
              {projects.length === 0 && <option value="">{t('noProjects')}</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'var(--canon-cream-3)' }}
            >
              {t('tipoLabel')}
            </span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as DocTipo)}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--canon-cream)',
              }}
            >
              {DOC_TIPOS.map((d) => (
                <option key={d} value={d}>
                  {t(`tipos.${d}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center"
          style={{
            borderColor: 'rgba(99,102,241,0.32)',
            background: 'rgba(99,102,241,0.06)',
          }}
        >
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => void onFiles(e.target.files)}
            disabled={uploading || !proyectoId}
          />
          <span className="text-sm font-semibold" style={{ color: 'var(--canon-cream)' }}>
            {uploading ? t('uploading') : t('dropZone')}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
            {t('dropZoneHint')}
          </span>
        </label>

        {feedback && (
          <p
            className="text-sm"
            style={{ color: feedback.kind === 'ok' ? '#86efac' : '#fca5a5' }}
            role="status"
          >
            {feedback.msg}
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
          {t('listTitle')}
        </h2>
        <ul className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ color: 'var(--canon-cream)' }}>
                  {d.nombre}
                </div>
                <div className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
                  {t(`tipos.${d.tipo as DocTipo}`)} · {t(`status.${d.status}`)} ·{' '}
                  {new Date(d.createdAt).toLocaleDateString('es-MX')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => void openDoc(d.id)}>
                  {t('previewCta')}
                </Button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate({ documentId: d.id })}
                  className="rounded-full border px-3 py-1 text-[11px]"
                  style={{ borderColor: 'rgba(248,113,113,0.4)', color: '#fca5a5' }}
                >
                  {t('deleteCta')}
                </button>
              </div>
            </li>
          ))}
          {docs.length === 0 && (
            <li className="py-3 text-sm" style={{ color: 'var(--canon-cream-3)' }}>
              {t('empty')}
            </li>
          )}
        </ul>
      </Card>

      <span
        className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
        style={{
          background: 'rgba(99,102,241,0.18)',
          color: '#a5b4fc',
        }}
        title={t('disclosureTitle')}
      >
        {t('disclosureBadge')}
      </span>
    </div>
  );
}
