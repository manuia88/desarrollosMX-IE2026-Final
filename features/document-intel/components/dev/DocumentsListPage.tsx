'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DOC_TYPE, type DocType } from '@/features/document-intel/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { DocumentJobItem, type DocumentJobItemData } from './DocumentJobItem';
import { UploadDocumentModal } from './UploadDocumentModal';

const STATUSES = ['uploaded', 'extracting', 'extracted', 'validated', 'approved', 'error'] as const;
type StatusFilter = (typeof STATUSES)[number];

export interface DocumentsListPageProps {
  readonly locale: string;
  readonly projects: ReadonlyArray<{ id: string; nombre: string }>;
}

export function DocumentsListPage({ locale, projects }: DocumentsListPageProps) {
  const t = useTranslations('dev.documents.list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter | ''>('');
  const [docTypeFilter, setDocTypeFilter] = useState<DocType | ''>('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const listQuery = trpc.documentIntel.listMyJobs.useQuery({
    limit: 50,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(docTypeFilter ? { doc_type: docTypeFilter } : {}),
  });

  const jobs = (listQuery.data ?? []) as ReadonlyArray<DocumentJobItemData>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
        <Button
          variant="primary"
          size="md"
          onClick={() => setUploadOpen(true)}
          aria-label={t('upload_button')}
        >
          {t('upload_button')}
        </Button>
      </header>

      <Card variant="recessed" className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="filter-doc-type"
            className="text-xs"
            style={{ color: 'var(--canon-cream)', opacity: 0.7 }}
          >
            {t('filter_doc_type')}
          </label>
          <select
            id="filter-doc-type"
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter((e.target.value as DocType) || '')}
            className="rounded-md p-1.5 text-sm"
            style={{
              background: 'var(--canon-bg)',
              border: '1px solid var(--canon-border)',
              color: 'var(--canon-cream)',
            }}
          >
            <option value="">{t('all')}</option>
            {DOC_TYPE.map((dt) => (
              <option key={dt} value={dt}>
                {dt}
              </option>
            ))}
          </select>

          <label
            htmlFor="filter-status"
            className="text-xs"
            style={{ color: 'var(--canon-cream)', opacity: 0.7 }}
          >
            {t('filter_status')}
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as StatusFilter) || '')}
            className="rounded-md p-1.5 text-sm"
            style={{
              background: 'var(--canon-bg)',
              border: '1px solid var(--canon-border)',
              color: 'var(--canon-cream)',
            }}
          >
            <option value="">{t('all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {listQuery.isLoading ? (
        <Card variant="recessed" className="p-6">
          <p className="text-center text-sm" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
            {t('loading')}
          </p>
        </Card>
      ) : jobs.length === 0 ? (
        <Card variant="recessed" className="p-8">
          <h2
            className="mb-2 text-center text-lg font-semibold"
            style={{ color: 'var(--canon-cream)' }}
          >
            {t('empty_title')}
          </h2>
          <p className="text-center text-sm" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
            {t('empty_description')}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <DocumentJobItem key={job.id} job={job} locale={locale} />
          ))}
        </div>
      )}

      <UploadDocumentModal
        open={uploadOpen}
        projects={projects}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          void listQuery.refetch();
        }}
      />
    </div>
  );
}
