'use client';

// F14.F.7 Sprint 6 BIBLIA v4 §6 UPGRADE 2 — Batch staging progress (aggregate + per-asset).
// DMX Studio dentro DMX único entorno (ADR-054). Pure UI, no tRPC calls.

import { Card, cn } from '@/shared/ui/primitives/canon';

export interface BatchStagingJob {
  readonly id: string;
  readonly status: string;
  readonly output_url: string | null;
  readonly source_asset_id: string | null;
}

export interface BatchStagingProgressProps {
  readonly jobs: ReadonlyArray<BatchStagingJob>;
}

const COMPLETED_STATUSES = new Set(['completed', 'succeeded', 'success', 'done']);
const FAILED_STATUSES = new Set(['failed', 'error', 'errored']);

function statusKind(status: string): 'completed' | 'failed' | 'pending' {
  const norm = status.toLowerCase();
  if (COMPLETED_STATUSES.has(norm)) return 'completed';
  if (FAILED_STATUSES.has(norm)) return 'failed';
  return 'pending';
}

const STATUS_BADGE_CLASS: Record<'completed' | 'failed' | 'pending', string> = {
  completed: 'bg-[color:rgba(34,197,94,0.18)] text-[color:#86efac] border-[color:rgba(34,197,94,0.40)]',
  failed: 'bg-[color:rgba(239,68,68,0.18)] text-[color:#fca5a5] border-[color:rgba(239,68,68,0.40)]',
  pending: 'bg-[color:rgba(99,102,241,0.18)] text-[color:var(--canon-indigo-2)] border-[color:rgba(99,102,241,0.40)]',
};

const STATUS_LABEL: Record<'completed' | 'failed' | 'pending', string> = {
  completed: 'Listo',
  failed: 'Error',
  pending: 'En proceso',
};

export function BatchStagingProgress({ jobs }: BatchStagingProgressProps) {
  const total = jobs.length;
  const completed = jobs.filter((j) => statusKind(j.status) === 'completed').length;
  const failed = jobs.filter((j) => statusKind(j.status) === 'failed').length;
  const pending = total - completed - failed;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <Card variant="elevated" className="p-5" aria-label="Progreso del batch de staging">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-bold text-[color:var(--canon-cream)]">
          Progreso de staging
        </h2>
        <p className="text-[12px] text-[color:var(--canon-cream-2)] tabular-nums">
          {completed} / {total} completadas
        </p>
      </div>

      <div
        className="mt-4 h-2 w-full rounded-full bg-[color:rgba(255,255,255,0.06)] overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Progreso ${pct} por ciento`}
      >
        <div
          className="h-full bg-[image:linear-gradient(90deg,_#6366f1,_#ec4899)] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <dl className="grid grid-cols-3 gap-3 mt-4">
        <div className="rounded-[var(--canon-radius-card)] bg-[var(--surface-recessed)] p-3">
          <dt className="text-[10px] uppercase tracking-wider text-[color:var(--canon-cream-2)]">
            Listas
          </dt>
          <dd className="text-[18px] font-extrabold text-[color:var(--canon-cream)] tabular-nums mt-1">
            {completed}
          </dd>
        </div>
        <div className="rounded-[var(--canon-radius-card)] bg-[var(--surface-recessed)] p-3">
          <dt className="text-[10px] uppercase tracking-wider text-[color:var(--canon-cream-2)]">
            En proceso
          </dt>
          <dd className="text-[18px] font-extrabold text-[color:var(--canon-cream)] tabular-nums mt-1">
            {pending}
          </dd>
        </div>
        <div className="rounded-[var(--canon-radius-card)] bg-[var(--surface-recessed)] p-3">
          <dt className="text-[10px] uppercase tracking-wider text-[color:var(--canon-cream-2)]">
            Fallidas
          </dt>
          <dd className="text-[18px] font-extrabold text-[color:var(--canon-cream)] tabular-nums mt-1">
            {failed}
          </dd>
        </div>
      </dl>

      <ul
        className="flex flex-col gap-2 mt-5 list-none p-0 m-0"
        aria-label="Lista de jobs por foto"
      >
        {jobs.map((job) => {
          const kind = statusKind(job.status);
          return (
            <li
              key={job.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-[var(--canon-radius-card)] bg-[var(--surface-recessed)]"
            >
              <div className="flex flex-col min-w-0">
                <p className="text-[12px] font-semibold text-[color:var(--canon-cream)] truncate">
                  {job.source_asset_id ?? job.id}
                </p>
                {job.output_url ? (
                  <a
                    href={job.output_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[color:var(--canon-indigo-2)] hover:underline truncate"
                  >
                    Ver resultado
                  </a>
                ) : (
                  <p className="text-[11px] text-[color:var(--canon-cream-2)] truncate">
                    {job.id}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-1 text-[11px] font-semibold border',
                  'rounded-[var(--canon-radius-pill)] tabular-nums',
                  STATUS_BADGE_CLASS[kind],
                )}
                aria-label={`Estado ${STATUS_LABEL[kind]}`}
              >
                {STATUS_LABEL[kind]}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
