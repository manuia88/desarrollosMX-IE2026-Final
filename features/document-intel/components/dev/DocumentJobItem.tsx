'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

export interface DocumentJobItemData {
  readonly id: string;
  readonly doc_type: string;
  readonly status: string;
  readonly original_filename: string | null;
  readonly file_size_bytes: number | null;
  readonly page_count: number | null;
  readonly quality_score: 'green' | 'amber' | 'red' | null;
  readonly ai_cost_usd: number | string | null;
  readonly charged_credits_usd: number | string | null;
  readonly created_at: string;
}

const QUALITY_STYLE: Record<
  'green' | 'amber' | 'red',
  { bg: string; border: string; color: string; label: string }
> = {
  green: {
    bg: 'rgba(16, 185, 129, 0.10)',
    border: 'rgba(16, 185, 129, 0.32)',
    color: '#6ee7b7',
    label: 'Excelente',
  },
  amber: {
    bg: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.32)',
    color: '#fcd34d',
    label: 'Revisar',
  },
  red: {
    bg: 'rgba(239, 68, 68, 0.10)',
    border: 'rgba(239, 68, 68, 0.32)',
    color: '#fca5a5',
    label: 'Crítico',
  },
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  uploaded: { bg: 'rgba(99,102,241,0.10)', color: '#a5b4fc', border: 'rgba(99,102,241,0.32)' },
  extracting: { bg: 'rgba(99,102,241,0.20)', color: '#a5b4fc', border: 'rgba(99,102,241,0.42)' },
  extracted: { bg: 'rgba(16,185,129,0.10)', color: '#6ee7b7', border: 'rgba(16,185,129,0.32)' },
  validated: { bg: 'rgba(16,185,129,0.18)', color: '#6ee7b7', border: 'rgba(16,185,129,0.42)' },
  approved: { bg: 'rgba(16,185,129,0.28)', color: '#6ee7b7', border: 'rgba(16,185,129,0.52)' },
  error: { bg: 'rgba(239,68,68,0.10)', color: '#fca5a5', border: 'rgba(239,68,68,0.32)' },
  duplicate_skipped: {
    bg: 'rgba(245,158,11,0.10)',
    color: '#fcd34d',
    border: 'rgba(245,158,11,0.32)',
  },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCost(value: number | string | null): string {
  if (value === null || value === undefined) return '$0.00';
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? `$${num.toFixed(4)}` : '$0.00';
}

export interface DocumentJobItemProps {
  readonly job: DocumentJobItemData;
  readonly locale: string;
}

export function DocumentJobItem({ job, locale }: DocumentJobItemProps) {
  const router = useRouter();
  const t = useTranslations('dev.documents.list');
  const tCompliance = useTranslations('dev.documents.compliance');
  const status = STATUS_STYLE[job.status] ?? STATUS_STYLE.uploaded;
  const quality = job.quality_score ? QUALITY_STYLE[job.quality_score] : null;

  const handleClick = () => {
    router.push(`/${locale}/desarrolladores/inventario/documentos/ai/${job.id}`);
  };

  return (
    <Card
      variant="elevated"
      className="cursor-pointer p-4 transition-transform hover:-translate-y-0.5"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={t('open_job', { name: job.original_filename ?? job.id.slice(0, 8) })}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className="truncate text-sm font-semibold"
            style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
          >
            {job.original_filename ?? job.id.slice(0, 8)}
          </h3>
          <p
            className="mt-1 text-xs font-mono"
            style={{ color: 'var(--canon-cream)', opacity: 0.6 }}
          >
            {job.doc_type}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 10px',
              borderRadius: 'var(--canon-radius-pill)',
              border: `1px solid ${status?.border ?? 'rgba(99,102,241,0.32)'}`,
              background: status?.bg ?? 'rgba(99,102,241,0.10)',
              color: status?.color ?? '#a5b4fc',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {job.status}
          </span>
          {quality ? (
            <span
              style={{
                display: 'inline-flex',
                padding: '2px 10px',
                borderRadius: 'var(--canon-radius-pill)',
                border: `1px solid ${quality.border}`,
                background: quality.bg,
                color: quality.color,
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}
            >
              {tCompliance(
                `severity_${job.quality_score === 'green' ? 'info' : job.quality_score === 'amber' ? 'warning' : 'critical'}`,
              )}
            </span>
          ) : null}
        </div>
      </div>
      <div
        className="mt-3 flex flex-wrap gap-4 text-xs"
        style={{ color: 'var(--canon-cream)', opacity: 0.7 }}
      >
        <span>{formatBytes(job.file_size_bytes)}</span>
        {job.page_count ? <span>{t('pages', { count: job.page_count })}</span> : null}
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCost(job.ai_cost_usd)}</span>
        <span style={{ marginLeft: 'auto' }}>{new Date(job.created_at).toLocaleDateString()}</span>
      </div>
    </Card>
  );
}
