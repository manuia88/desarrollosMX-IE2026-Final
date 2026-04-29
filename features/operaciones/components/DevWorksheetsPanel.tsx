'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

type WorksheetStatusFilter = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

type WorksheetRow = {
  id: string;
  unit_id: string;
  asesor_id: string;
  desarrolladora_id: string;
  status: WorksheetStatusFilter;
  expires_at: string;
  requested_at: string;
  decided_at: string | null;
  decided_by: string | null;
  reject_reason: string | null;
  client_first_name: string;
  notes: string | null;
  operacion_id: string | null;
  priority_score: number;
};

const STATUS_TABS: readonly WorksheetStatusFilter[] = [
  'pending',
  'approved',
  'rejected',
  'expired',
  'cancelled',
] as const;

export function DevWorksheetsPanel() {
  const t = useTranslations('dev.worksheets.devPanel');
  const [statusFilter, setStatusFilter] = useState<WorksheetStatusFilter>('pending');
  const [rejectModal, setRejectModal] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const listQ = trpc.worksheets.listMyWorksheets.useQuery({
    status: statusFilter,
    limit: 100,
  });

  const approveMutation = trpc.worksheets.approveWorksheet.useMutation({
    onSuccess: () => {
      utils.worksheets.listMyWorksheets.invalidate().catch(() => undefined);
    },
  });

  const rejectMutation = trpc.worksheets.rejectWorksheet.useMutation({
    onSuccess: () => {
      utils.worksheets.listMyWorksheets.invalidate().catch(() => undefined);
      setRejectModal(null);
    },
  });

  const rows = ((listQ.data ?? []) as WorksheetRow[]).slice();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          {t('title')}
        </h1>
        <p style={{ margin: 0, color: 'var(--canon-cream-2)', fontSize: 13 }}>{t('subtitle')}</p>
      </header>

      <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((s) => {
          const active = s === statusFilter;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--canon-radius-pill)',
                border: '1px solid',
                borderColor: active ? 'transparent' : 'var(--canon-border-2)',
                background: active ? 'var(--canon-gradient)' : 'transparent',
                color: active ? '#fff' : 'var(--canon-cream-2)',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {t(`tabs.${s}`)}
            </button>
          );
        })}
      </div>

      {listQ.isLoading ? (
        <p style={{ color: 'var(--canon-cream-3)', fontSize: 13 }}>{t('loading')}</p>
      ) : null}

      {!listQ.isLoading && rows.length === 0 ? (
        <Card variant="elevated" className="px-5 py-6">
          <p style={{ margin: 0, color: 'var(--canon-cream-2)', fontSize: 13 }}>{t('empty')}</p>
        </Card>
      ) : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
        {rows.map((row) => (
          <li key={row.id}>
            <WorksheetCard
              row={row}
              onApprove={() => approveMutation.mutate({ worksheetId: row.id })}
              onReject={() => setRejectModal(row.id)}
              approving={
                approveMutation.isPending && approveMutation.variables?.worksheetId === row.id
              }
              rejecting={
                rejectMutation.isPending && rejectMutation.variables?.worksheetId === row.id
              }
            />
          </li>
        ))}
      </ul>

      {rejectModal ? (
        <RejectReasonModal
          isOpen={true}
          onClose={() => setRejectModal(null)}
          submitting={rejectMutation.isPending}
          onSubmit={(reason) =>
            rejectMutation.mutate({
              worksheetId: rejectModal,
              ...(reason ? { reason } : {}),
            })
          }
        />
      ) : null}
    </div>
  );
}

interface WorksheetCardProps {
  row: WorksheetRow;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
}

function WorksheetCard({ row, onApprove, onReject, approving, rejecting }: WorksheetCardProps) {
  const t = useTranslations('dev.worksheets.devPanel');
  const expiresIn = formatHoursRemaining(row.expires_at);
  const isPending = row.status === 'pending';

  return (
    <Card variant="elevated" className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: 'var(--canon-white-pure)',
          }}
        >
          {row.client_first_name}
        </span>
        <span style={{ color: 'var(--canon-cream-3)', fontSize: 12 }}>
          {t('unitLabel', { unitId: row.unit_id.slice(0, 8) })}
        </span>
        {row.notes ? (
          <span style={{ color: 'var(--canon-cream-2)', fontSize: 12 }}>{row.notes}</span>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
        <span style={{ fontSize: 11, color: 'var(--canon-cream-3)' }}>{t('priorityLabel')}</span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 16,
            color: row.priority_score >= 70 ? 'var(--canon-rose)' : 'var(--canon-cream)',
          }}
        >
          {row.priority_score}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
        <span style={{ fontSize: 11, color: 'var(--canon-cream-3)' }}>{t('expiresLabel')}</span>
        <span style={{ fontSize: 12, color: 'var(--canon-cream-2)' }}>{expiresIn}</span>
      </div>

      {isPending ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onApprove}
            disabled={approving || rejecting}
          >
            {approving ? t('actions.approving') : t('actions.approve')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReject}
            disabled={approving || rejecting}
          >
            {rejecting ? t('actions.rejecting') : t('actions.reject')}
          </Button>
        </div>
      ) : (
        <span
          style={{
            padding: '4px 10px',
            borderRadius: 'var(--canon-radius-pill)',
            border: '1px solid var(--canon-border-2)',
            color: 'var(--canon-cream-2)',
            fontSize: 11,
            textTransform: 'uppercase',
          }}
        >
          {t(`statusLabel.${row.status}`)}
        </span>
      )}
    </Card>
  );
}

interface RejectReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
}

function RejectReasonModal({ isOpen, onClose, onSubmit, submitting }: RejectReasonModalProps) {
  const t = useTranslations('dev.worksheets.devPanel.rejectModal');
  const [reason, setReason] = useState('');
  const titleId = useId();
  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(reason.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        padding: 16,
      }}
    >
      <button
        type="button"
        aria-label={t('close')}
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      />
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'relative',
          width: 'min(420px, 100%)',
          background: 'var(--surface-elevated)',
          color: 'var(--canon-cream)',
          borderRadius: 16,
          padding: 22,
          border: '1px solid var(--canon-border-2)',
          boxShadow: 'var(--shadow-canon-spotlight)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h2
          id={titleId}
          style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}
        >
          {t('title')}
        </h2>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={400}
          rows={4}
          placeholder={t('placeholder')}
          style={{
            background: 'var(--surface-recessed)',
            border: '1px solid var(--canon-border-2)',
            borderRadius: 8,
            color: 'var(--canon-cream)',
            padding: '8px 10px',
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={submitting}>
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function formatHoursRemaining(expiresAtIso: string): string {
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  if (ms <= 0) return '0h';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const rest = hours % 24;
    return `${days}d ${rest}h`;
  }
  return `${hours}h ${minutes}m`;
}
