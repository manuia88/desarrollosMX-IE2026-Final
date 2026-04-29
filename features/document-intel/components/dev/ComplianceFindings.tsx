'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

type Severity = 'critical' | 'warning' | 'info';

interface ComplianceRow {
  readonly id: string;
  readonly check_code: string;
  readonly severity: string;
  readonly finding: string;
  readonly source_job_ids: string[] | null;
  readonly ai_recommendation: string | null;
  readonly resolved_at: string | null;
  readonly resolution_note: string | null;
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
const SEVERITY_BADGE: Record<Severity, { bg: string; border: string; color: string }> = {
  critical: { bg: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.32)', color: '#fca5a5' },
  warning: { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.32)', color: '#fcd34d' },
  info: { bg: 'rgba(99, 102, 241, 0.10)', border: 'rgba(99, 102, 241, 0.32)', color: '#a5b4fc' },
};

export interface ComplianceFindingsProps {
  readonly proyectoId: string;
}

export function ComplianceFindings({ proyectoId }: ComplianceFindingsProps) {
  const t = useTranslations('dev.documents.compliance');
  const utils = trpc.useUtils();
  const checksQuery = trpc.documentIntel.getProjectComplianceChecks.useQuery({
    proyecto_id: proyectoId,
  });
  const runMutation = trpc.documentIntel.runComplianceCheckManual.useMutation({
    onSuccess: () => {
      void utils.documentIntel.getProjectComplianceChecks.invalidate({ proyecto_id: proyectoId });
    },
  });
  const resolveMutation = trpc.documentIntel.resolveComplianceCheck.useMutation({
    onSuccess: () => {
      void utils.documentIntel.getProjectComplianceChecks.invalidate({ proyecto_id: proyectoId });
    },
  });

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);

  const checks = (checksQuery.data ?? []) as ReadonlyArray<ComplianceRow>;
  const sorted = useMemo(() => {
    const arr: ComplianceRow[] = [...checks];
    arr.sort((a, b) => {
      const ar = a.resolved_at !== null ? 1 : 0;
      const br = b.resolved_at !== null ? 1 : 0;
      if (ar !== br) return ar - br;
      const sa = SEVERITY_RANK[(a.severity as Severity) ?? 'info'] ?? 99;
      const sb = SEVERITY_RANK[(b.severity as Severity) ?? 'info'] ?? 99;
      return sa - sb;
    });
    return arr;
  }, [checks]);

  const severityLabel = (s: Severity): string => {
    if (s === 'critical') return t('severity_critical');
    if (s === 'warning') return t('severity_warning');
    return t('severity_info');
  };

  const handleConfirmResolve = async () => {
    if (!resolvingId) return;
    if (note.trim().length === 0) {
      setError(t('resolution_required'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resolveMutation.mutateAsync({ check_id: resolvingId, note: note.trim() });
      setResolvingId(null);
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('resolution_required'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunManual = async () => {
    try {
      await runMutation.mutateAsync({ proyecto_id: proyectoId });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown_error');
    }
  };

  return (
    <Card variant="elevated" className="p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
          >
            {t('section_title')}
          </h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
            {t('subtitle')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleRunManual()}
          disabled={runMutation.isPending}
          aria-label={t('run_manual')}
        >
          {runMutation.isPending ? t('run_started') : t('run_manual')}
        </Button>
      </header>

      {checksQuery.isLoading ? (
        <p className="text-center text-sm" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
          {t('loading')}
        </p>
      ) : sorted.length === 0 ? (
        <Card variant="recessed" className="p-6">
          <p className="text-center text-sm" style={{ color: 'var(--canon-cream)', opacity: 0.7 }}>
            {t('empty')}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((c) => {
            const sev = (c.severity as Severity) ?? 'info';
            const badge = SEVERITY_BADGE[sev];
            const resolved = c.resolved_at !== null;
            const expanded = expandedRecId === c.id;
            return (
              <li
                key={c.id}
                style={{
                  border: '1px solid var(--canon-border)',
                  borderRadius: 'var(--canon-radius-md)',
                  padding: '12px',
                  background: 'var(--canon-bg)',
                  opacity: resolved ? 0.6 : 1,
                }}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    style={{
                      display: 'inline-flex',
                      padding: '2px 8px',
                      borderRadius: 'var(--canon-radius-pill)',
                      border: `1px solid ${badge.border}`,
                      background: badge.bg,
                      color: badge.color,
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {severityLabel(sev)}
                  </span>
                  <span
                    className="font-mono text-xs"
                    style={{ color: 'var(--canon-cream)', opacity: 0.65 }}
                  >
                    {c.check_code}
                  </span>
                  {resolved ? (
                    <span className="text-xs" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
                      · {t('resolved')}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm" style={{ color: 'var(--canon-cream)' }}>
                  {c.finding}
                </p>
                {c.ai_recommendation ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setExpandedRecId(expanded ? null : c.id)}
                      className="text-xs underline"
                      style={{ color: 'var(--canon-cream)', opacity: 0.85 }}
                      aria-expanded={expanded}
                    >
                      {expanded ? t('hide_recommendation') : t('recommendation')}
                    </button>
                    {expanded ? (
                      <p
                        className="mt-2 rounded-md p-3 text-xs"
                        style={{
                          background: 'rgba(99,102,241,0.08)',
                          border: '1px solid rgba(99,102,241,0.25)',
                          color: 'var(--canon-cream)',
                        }}
                      >
                        {c.ai_recommendation}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {Array.isArray(c.source_job_ids) && c.source_job_ids.length > 0 ? (
                  <p
                    className="mt-2 font-mono text-xs"
                    style={{ color: 'var(--canon-cream)', opacity: 0.55 }}
                  >
                    {t('source_jobs')}: {c.source_job_ids.map((id) => id.slice(0, 8)).join(', ')}
                  </p>
                ) : null}
                {!resolved ? (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResolvingId(c.id);
                        setNote('');
                        setError(null);
                      }}
                      aria-label={t('mark_resolved')}
                    >
                      {t('mark_resolved')}
                    </Button>
                  </div>
                ) : c.resolution_note ? (
                  <p className="mt-2 text-xs" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
                    {t('resolved_by')}: {c.resolution_note}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {resolvingId !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('mark_resolved')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <Card variant="elevated" className="w-full max-w-md p-6">
            <h4
              className="mb-2 text-base font-semibold"
              style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
            >
              {t('mark_resolved')}
            </h4>
            <label
              htmlFor={`compliance-note-${proyectoId}`}
              className="mb-1 block text-xs"
              style={{ color: 'var(--canon-cream)', opacity: 0.7 }}
            >
              {t('resolution_note_label')}
            </label>
            <textarea
              id={`compliance-note-${proyectoId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              rows={4}
              className="w-full rounded-md p-2 text-sm"
              style={{
                background: 'var(--canon-bg)',
                border: '1px solid var(--canon-border)',
                color: 'var(--canon-cream)',
              }}
            />
            {error ? (
              <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => {
                  setResolvingId(null);
                  setNote('');
                  setError(null);
                }}
                aria-label={t('cancel')}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleConfirmResolve()}
                disabled={submitting}
                aria-label={t('confirm')}
              >
                {submitting ? t('submitting') : t('confirm')}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
