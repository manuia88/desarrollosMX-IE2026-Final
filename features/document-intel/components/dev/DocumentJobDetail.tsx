'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { ComplianceFindings } from './ComplianceFindings';
import { DedupeIndicator } from './DedupeIndicator';
import { ValidationFindings } from './ValidationFindings';

export interface DocumentJobDetailProps {
  readonly jobId: string;
  readonly locale: string;
}

export function DocumentJobDetail({ jobId, locale }: DocumentJobDetailProps) {
  const t = useTranslations('dev.documents.detail');
  const router = useRouter();
  const utils = trpc.useUtils();

  const jobQuery = trpc.documentIntel.getJob.useQuery({ id: jobId });
  const extractionQuery = trpc.documentIntel.getExtractedData.useQuery({ jobId });
  const validationsQuery = trpc.documentIntel.getJobValidations.useQuery({ job_id: jobId });
  const dedupeQuery = trpc.documentIntel.getJobDuplicateInfo.useQuery({ job_id: jobId });
  const resolveValidation = trpc.documentIntel.resolveValidation.useMutation({
    onSuccess: () => {
      void utils.documentIntel.getJobValidations.invalidate({ job_id: jobId });
    },
  });

  const handleResolve = useCallback(
    async (id: string, note: string) => {
      await resolveValidation.mutateAsync({ validation_id: id, note });
    },
    [resolveValidation],
  );

  const job = jobQuery.data;
  const extractionData = extractionQuery.data as
    | { extraction: { extracted_data: unknown } | null }
    | undefined;
  const extraction = extractionData?.extraction ?? null;
  const validations = validationsQuery.data ?? [];
  const dedupe = dedupeQuery.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${locale}/desarrolladores/inventario/documentos/ai`)}
          aria-label={t('back_to_list')}
        >
          ← {t('back_to_list')}
        </Button>
        <h1
          className="mt-3 text-2xl font-bold"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {job?.original_filename ?? jobId.slice(0, 8)}
        </h1>
        <p className="mt-1 text-sm font-mono" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
          {job?.doc_type} · {job?.status}
        </p>
      </header>

      {dedupe?.isDuplicate ? (
        <Card variant="recessed" className="mb-6 p-4">
          <h2 className="mb-2 text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
            {t('dedupe_section')}
          </h2>
          <DedupeIndicator
            duplicateOfJobId={dedupe.original?.id ?? (dedupe.isDuplicate ? jobId : null)}
            {...(dedupe.original?.id ? { previousJobShortId: dedupe.original.id.slice(0, 8) } : {})}
          />
        </Card>
      ) : null}

      {job?.proyecto_id ? (
        <section className="mb-6">
          <ComplianceFindings proyectoId={job.proyecto_id} />
        </section>
      ) : null}

      <Card variant="elevated" className="mb-6 p-4">
        <h2
          className="mb-3 text-base font-semibold"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('extracted_section')}
        </h2>
        {extraction ? (
          <pre
            className="overflow-x-auto rounded-md p-3 text-xs"
            style={{
              background: 'var(--canon-bg)',
              color: 'var(--canon-cream)',
              maxHeight: '400px',
            }}
          >
            {JSON.stringify(extraction.extracted_data, null, 2)}
          </pre>
        ) : (
          <p className="text-sm" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
            —
          </p>
        )}
      </Card>

      <section className="mb-6">
        <h2
          className="mb-3 text-base font-semibold"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('validations_section')}
        </h2>
        <ValidationFindings
          validations={validations as never}
          jobId={jobId}
          canResolve={true}
          onResolve={handleResolve}
        />
      </section>
    </div>
  );
}
