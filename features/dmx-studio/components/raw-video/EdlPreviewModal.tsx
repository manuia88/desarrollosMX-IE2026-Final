'use client';

// F14.F.6 Sprint 5 BIBLIA UPGRADE 3 — Smart EDL preview modal.

import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';
import { EdlCutBadge, type EdlCutReason } from './EdlCutBadge';

export interface EdlPreviewModalProps {
  readonly rawVideoId: string;
  readonly onClose?: () => void;
  readonly onApproved?: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function EdlPreviewModal({ rawVideoId, onClose, onApproved }: EdlPreviewModalProps) {
  const previewQuery = trpc.studio.cuts.getPreview.useQuery({ rawVideoId });
  const approveMutation = trpc.studio.cuts.approveCuts.useMutation();
  const [approvedSet, setApprovedSet] = useState<Set<number>>(new Set());

  if (previewQuery.isLoading) return <div role="status">Cargando preview...</div>;
  if (previewQuery.error) {
    return (
      <div role="alert" style={{ color: 'var(--canon-red)' }}>
        {previewQuery.error.message}
      </div>
    );
  }

  const cuts = previewQuery.data?.cuts ?? [];

  const toggleAll = (approve: boolean) => {
    if (approve) {
      setApprovedSet(new Set(cuts.map((c) => c.index)));
    } else {
      setApprovedSet(new Set());
    }
  };

  const handleSubmit = async () => {
    await approveMutation.mutateAsync({
      rawVideoId,
      approvedCutIndices: Array.from(approvedSet),
    });
    onApproved?.();
  };

  return (
    <div
      role="dialog"
      aria-label="Revisión cortes EDL"
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--canon-radius-card)',
        padding: '24px',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', color: 'var(--canon-cream)', fontWeight: 700 }}>
          {cuts.length} cortes detectados
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>
            Aprobar todos
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>
            Rechazar todos
          </Button>
        </div>
      </header>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '16px' }}>
        {cuts.map((cut) => {
          const isApproved = approvedSet.has(cut.index);
          return (
            <li
              key={cut.index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: 'var(--canon-radius-inner)',
                background: isApproved ? 'rgba(45, 212, 191, 0.10)' : 'transparent',
                borderBottom: '1px solid var(--canon-border)',
              }}
            >
              <div>
                <EdlCutBadge reason={cut.reason as EdlCutReason} />
                <span
                  style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--canon-cream-2)' }}
                >
                  {formatTime(cut.startMs)} → {formatTime(cut.endMs)}
                </span>
                {cut.preview ? (
                  <p style={{ fontSize: '12px', color: 'var(--canon-cream-2)', marginTop: '4px' }}>
                    "{cut.preview}"
                  </p>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Button
                  variant={isApproved ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setApprovedSet((prev) => {
                      const next = new Set(prev);
                      if (next.has(cut.index)) next.delete(cut.index);
                      else next.add(cut.index);
                      return next;
                    });
                  }}
                  aria-label={
                    isApproved ? `Rechazar corte ${cut.index}` : `Aprobar corte ${cut.index}`
                  }
                >
                  {isApproved ? '✓ Aprobado' : 'Aprobar'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <footer style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Button variant="ghost" size="md" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" size="md" onClick={handleSubmit}>
          Confirmar {approvedSet.size} cortes
        </Button>
      </footer>
    </div>
  );
}
