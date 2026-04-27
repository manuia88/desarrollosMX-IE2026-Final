'use client';

// FASE 14.F.4 Sprint 3 — Bulk batch progress tracker.
// Polls trpc.studio.urlImport.getStatus cada 3s. Stops cuando todos terminales.
// Visual: pending (spinner), scraping (progress), completed (check), failed (X), blocked (warning).
// ADR-050 canon: glass card, brand gradient progress bar, prefers-reduced-motion respected.

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { StudioPortal, StudioUrlImportStatus } from '@/features/dmx-studio/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

const POLLING_INTERVAL_MS = 3000;

const TERMINAL_STATUSES: ReadonlySet<StudioUrlImportStatus> = new Set([
  'completed',
  'failed',
  'blocked',
  'manual_required',
]);

export interface BulkProgressTrackerProps {
  readonly batchId: string;
  readonly onAllCompleted?: (
    items: ReadonlyArray<{ readonly id: string; readonly status: StudioUrlImportStatus }>,
  ) => void;
}

interface BatchItem {
  readonly id: string;
  readonly source_url: string;
  readonly source_portal: StudioPortal;
  readonly scrape_status: StudioUrlImportStatus;
  readonly error_message: string | null;
  readonly photos_extracted: number | null;
  readonly retry_count: number | null;
  readonly created_at: string;
}

function StatusIcon({ status }: { status: StudioUrlImportStatus }) {
  if (status === 'completed') {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: 'var(--canon-radius-pill)',
          background: 'rgba(16,185,129,0.18)',
          color: '#6EE7B7',
          fontSize: '12px',
          fontWeight: 800,
        }}
      >
        ✓
      </span>
    );
  }
  if (status === 'failed' || status === 'blocked' || status === 'manual_required') {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: 'var(--canon-radius-pill)',
          background: 'rgba(244,63,94,0.16)',
          color: '#FCA5A5',
          fontSize: '12px',
          fontWeight: 800,
        }}
      >
        {status === 'blocked' ? '!' : '✕'}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        borderRadius: 'var(--canon-radius-pill)',
        background: 'rgba(99,102,241,0.18)',
        color: '#A5B4FC',
        fontSize: '12px',
        fontWeight: 800,
      }}
    >
      ⋯
    </span>
  );
}

export function BulkProgressTracker({ batchId, onAllCompleted }: BulkProgressTrackerProps) {
  const t = useTranslations('Studio.urlImport');

  const statusQuery = trpc.studio.urlImport.getStatus.useQuery(
    { batchId },
    {
      refetchInterval(query) {
        const data = query.state.data as ReadonlyArray<BatchItem> | undefined;
        if (!data || data.length === 0) return POLLING_INTERVAL_MS;
        const allDone = data.every((it) => TERMINAL_STATUSES.has(it.scrape_status));
        return allDone ? false : POLLING_INTERVAL_MS;
      },
      refetchIntervalInBackground: false,
    },
  );

  const items = useMemo<ReadonlyArray<BatchItem>>(
    () => (statusQuery.data ?? []) as unknown as ReadonlyArray<BatchItem>,
    [statusQuery.data],
  );

  const total = items.length;
  const completedCount = items.filter((it) => TERMINAL_STATUSES.has(it.scrape_status)).length;
  const successCount = items.filter((it) => it.scrape_status === 'completed').length;
  const failedCount = items.filter(
    (it) =>
      it.scrape_status === 'failed' ||
      it.scrape_status === 'blocked' ||
      it.scrape_status === 'manual_required',
  ).length;
  const allDone = total > 0 && completedCount === total;
  const progressPct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  if (allDone && onAllCompleted) {
    onAllCompleted(items.map((it) => ({ id: it.id, status: it.scrape_status })));
  }

  return (
    <Card
      variant="elevated"
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      data-testid={`bulk-progress-${batchId}`}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h3
          className="font-[var(--font-display)] text-lg font-bold"
          style={{ color: '#FFFFFF', margin: 0 }}
        >
          {t('progressTitle')}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--canon-cream-2)',
          }}
        >
          {t('progressSummary', {
            done: completedCount,
            total,
            success: successCount,
            failed: failedCount,
          })}
        </p>
      </header>

      <div
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('progressBarLabel')}
        style={{
          width: '100%',
          height: '8px',
          background: 'var(--surface-recessed)',
          borderRadius: 'var(--canon-radius-pill)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #6366F1, #EC4899)',
            transition: 'width var(--canon-duration-normal) var(--canon-ease-out)',
          }}
        />
      </div>

      <ul
        aria-label={t('progressListLabel')}
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
              borderRadius: 'var(--canon-radius-pill)',
            }}
            data-testid={`bulk-progress-item-${item.id}`}
            data-status={item.scrape_status}
          >
            <StatusIcon status={item.scrape_status} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--canon-indigo-2)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                minWidth: '90px',
              }}
            >
              {t(`portal.${item.source_portal}` as never)}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: '12.5px',
                color: 'var(--canon-cream)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              {item.source_url}
            </span>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--canon-cream-2)',
              }}
            >
              {t(`status.${item.scrape_status}` as never)}
            </span>
          </li>
        ))}
      </ul>

      {statusQuery.isError && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '10px 14px',
            background: 'rgba(244,63,94,0.10)',
            border: '1px solid rgba(244,63,94,0.30)',
            borderRadius: 'var(--canon-radius-card)',
            fontSize: '13px',
            color: '#FCA5A5',
          }}
        >
          {t('errorLoading')}
        </p>
      )}
    </Card>
  );
}
