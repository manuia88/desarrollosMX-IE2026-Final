'use client';

// F14.F.5 Sprint 4 Tarea 4.3 — Render-en-dashboard remarketing automatico jobs.
// Conditional render: si no hay jobs (pending|generating|completed) -> null.
// Lista source project + new angle + status + created date. ADR-050 canon: Card
// elevated, DisclosurePill tone por status, SOLO translateY hover (en Card hoverable),
// strings ES inline (R11 sub-agent rule), botones pill via canon Button (no presente
// aqui — solo lista informativa).

import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card, DisclosurePill, type DisclosureTone } from '@/shared/ui/primitives/canon';

const SECTION_TITLE = 'Remarketing automatico';
const SUBTITLE = 'Variantes generadas del mismo inmueble';
const DATE_PREFIX = 'Generado';

const ANGLE_LABEL_ES: Record<string, string> = {
  general: 'General',
  cocina: 'Cocina',
  zona: 'Zona',
  inversionista: 'Inversionista',
  familiar: 'Familiar',
  lujo: 'Lujo',
};

const STATUS_LABEL_ES: Record<string, string> = {
  pending: 'En cola',
  generating: 'Generando',
  completed: 'Listo',
  failed: 'Fallido',
};

const STATUS_TONE: Record<string, DisclosureTone> = {
  pending: 'amber',
  generating: 'indigo',
  completed: 'violet',
  failed: 'rose',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '20px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '13px',
  lineHeight: 1.45,
};

const angleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '15px',
  color: '#FFFFFF',
  lineHeight: 1.3,
};

const sourceIdStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '11.5px',
  letterSpacing: '0.02em',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const dateStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '12px',
  fontVariantNumeric: 'tabular-nums',
};

export interface RemarketingActiveJobsProps {
  readonly locale: string;
}

function statusLabel(status: string): string {
  return STATUS_LABEL_ES[status] ?? status;
}

function angleLabel(angle: string): string {
  return ANGLE_LABEL_ES[angle] ?? angle;
}

function statusTone(status: string): DisclosureTone {
  return STATUS_TONE[status] ?? 'indigo';
}

export function RemarketingActiveJobs({ locale }: RemarketingActiveJobsProps) {
  const jobsQuery = trpc.studio.remarketing.getActiveJobs.useQuery();
  const jobs = jobsQuery.data ?? [];

  if (jobsQuery.isLoading || jobs.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={SECTION_TITLE}
      className="flex flex-col gap-4"
      data-testid="studio-remarketing-active-jobs"
    >
      <header className="flex flex-col gap-1">
        <h2 style={titleStyle}>{SECTION_TITLE}</h2>
        <p style={subtitleStyle}>{SUBTITLE}</p>
      </header>
      <ul
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        style={{ listStyle: 'none', padding: 0, margin: 0 }}
      >
        {jobs.map((job) => (
          <li key={job.id}>
            <Card
              variant="elevated"
              hoverable
              className="flex flex-col gap-3 p-5"
              data-testid="studio-remarketing-job-card"
            >
              <div className="flex items-center justify-between gap-3">
                <DisclosurePill tone={statusTone(job.status)}>
                  {statusLabel(job.status)}
                </DisclosurePill>
                <span style={sourceIdStyle}>#{job.sourceProjectId.slice(0, 8)}</span>
              </div>
              <p style={angleStyle}>{angleLabel(job.angle)}</p>
              <span style={dateStyle}>
                {DATE_PREFIX}{' '}
                {new Date(job.createdAt).toLocaleDateString(locale, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
