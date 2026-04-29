'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button, Card } from '@/shared/ui/primitives/canon';
import type { ValidationRecord, ValidationSeverity } from '../../schemas/validation';

const SEVERITY_ORDER: Record<ValidationSeverity, number> = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3,
};

const SEVERITY_BADGE_STYLE: Record<
  ValidationSeverity,
  { bg: string; border: string; color: string }
> = {
  critical: { bg: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.32)', color: '#fca5a5' },
  error: { bg: 'rgba(249, 115, 22, 0.10)', border: 'rgba(249, 115, 22, 0.32)', color: '#fdba74' },
  warning: { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.32)', color: '#fcd34d' },
  info: { bg: 'rgba(99, 102, 241, 0.10)', border: 'rgba(99, 102, 241, 0.32)', color: '#a5b4fc' },
};

export interface ValidationFindingsProps {
  readonly validations: ReadonlyArray<ValidationRecord>;
  readonly jobId: string;
  readonly canResolve: boolean;
  readonly onResolve?: (id: string, note: string) => Promise<void>;
}

export function ValidationFindings({
  validations,
  jobId,
  canResolve,
  onResolve,
}: ValidationFindingsProps) {
  const t = useTranslations('dev.documents.validations');
  const tSeverity = useTranslations('dev.documents.compliance');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...validations].sort((a, b) => {
      const aResolved = a.resolved_at !== null ? 1 : 0;
      const bResolved = b.resolved_at !== null ? 1 : 0;
      if (aResolved !== bResolved) return aResolved - bResolved;
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    });
  }, [validations]);

  const severityLabel = (s: ValidationSeverity): string => {
    if (s === 'critical') return tSeverity('severity_critical');
    if (s === 'warning') return tSeverity('severity_warning');
    if (s === 'info') return tSeverity('severity_info');
    return t('severity_error');
  };

  if (sorted.length === 0) {
    return (
      <Card variant="recessed" className="p-6">
        <p className="text-center text-sm" style={{ color: 'var(--canon-cream)', opacity: 0.7 }}>
          {t('empty')}
        </p>
      </Card>
    );
  }

  const handleConfirmResolve = async () => {
    if (!resolvingId || !onResolve) return;
    if (note.trim().length === 0) {
      setError(t('resolution_required'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onResolve(resolvingId, note.trim());
      setResolvingId(null);
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('resolution_required'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card variant="elevated" className="p-4" data-job-id={jobId}>
      <header className="mb-4 flex items-center justify-between">
        <h3
          className="text-base font-semibold"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h3>
        <span className="text-xs" style={{ color: 'var(--canon-cream)', opacity: 0.6 }}>
          {sorted.length}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--canon-cream)', opacity: 0.7 }}>
              <th className="px-2 py-2 font-medium">{t('col_severity')}</th>
              <th className="px-2 py-2 font-medium">{t('col_code')}</th>
              <th className="px-2 py-2 font-medium">{t('col_message')}</th>
              <th className="px-2 py-2 font-medium">{t('col_field')}</th>
              {canResolve ? <th className="px-2 py-2 font-medium">{t('col_actions')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => {
              const badge = SEVERITY_BADGE_STYLE[v.severity];
              const resolved = v.resolved_at !== null;
              return (
                <tr
                  key={v.id}
                  style={{
                    borderTop: '1px solid var(--canon-border)',
                    opacity: resolved ? 0.55 : 1,
                  }}
                >
                  <td className="px-2 py-2 align-top">
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
                      {severityLabel(v.severity)}
                    </span>
                  </td>
                  <td
                    className="px-2 py-2 align-top font-mono text-xs"
                    style={{ color: 'var(--canon-cream)', opacity: 0.8 }}
                  >
                    {v.rule_code}
                  </td>
                  <td className="px-2 py-2 align-top" style={{ color: 'var(--canon-cream)' }}>
                    {v.message}
                  </td>
                  <td
                    className="px-2 py-2 align-top font-mono text-xs"
                    style={{ color: 'var(--canon-cream)', opacity: 0.6 }}
                  >
                    {v.field_path ?? '—'}
                  </td>
                  {canResolve ? (
                    <td className="px-2 py-2 align-top">
                      {resolved ? (
                        <span
                          className="text-xs"
                          style={{ color: 'var(--canon-cream)', opacity: 0.6 }}
                        >
                          {tSeverity('resolved')}
                        </span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResolvingId(v.id);
                            setNote('');
                            setError(null);
                          }}
                          aria-label={t('mark_resolved')}
                        >
                          {t('mark_resolved')}
                        </Button>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
              htmlFor={`resolution-note-${jobId}`}
              className="mb-1 block text-xs"
              style={{ color: 'var(--canon-cream)', opacity: 0.7 }}
            >
              {t('resolution_note_label')}
            </label>
            <textarea
              id={`resolution-note-${jobId}`}
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
                onClick={handleConfirmResolve}
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
