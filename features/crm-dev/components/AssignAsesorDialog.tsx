'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import { Button } from '@/shared/ui/primitives/canon';
import { useAssignAsesor, useInvalidateCrmDevQueries } from '../hooks/use-crm-dev';

export interface AssignAsesorDialogProps {
  readonly leadId: string;
  readonly currentAsesorId: string | null;
  readonly onClose: () => void;
}

export function AssignAsesorDialog({ leadId, currentAsesorId, onClose }: AssignAsesorDialogProps) {
  const t = useTranslations('dev.crm.assign');
  const [asesorId, setAsesorId] = useState<string>(currentAsesorId ?? '');
  const assign = useAssignAsesor();
  const invalidate = useInvalidateCrmDevQueries();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = asesorId.trim();
    await assign.mutateAsync({
      leadId,
      asesorId: value.length > 0 ? value : null,
    });
    invalidate.invalidateLead(leadId);
    onClose();
  };

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const cardStyle: CSSProperties = {
    background: 'var(--canon-bg-2)',
    border: '1px solid var(--canon-border-2)',
    borderRadius: 'var(--canon-radius-card)',
    padding: 20,
    width: 'min(420px, 92vw)',
    boxShadow: 'var(--shadow-canon-elevated)',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      style={overlayStyle}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={cardStyle}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            margin: '0 0 12px',
            color: 'var(--canon-cream)',
          }}
        >
          {t('title')}
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--canon-cream-2)',
            margin: '0 0 16px',
          }}
        >
          {t('description')}
        </p>
        <label
          htmlFor="asesorId"
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--canon-cream-2)',
            marginBottom: 4,
          }}
        >
          {t('inputLabel')}
        </label>
        <input
          id="asesorId"
          type="text"
          value={asesorId}
          onChange={(e) => setAsesorId(e.target.value)}
          placeholder={t('placeholder')}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 'var(--canon-radius-input)',
            border: '1px solid var(--canon-border-2)',
            background: 'var(--canon-bg)',
            color: 'var(--canon-cream)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
          }}
        />
        {assign.error ? (
          <p style={{ color: '#fca5a5', fontSize: 11, marginTop: 8 }}>{assign.error.message}</p>
        ) : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" size="sm" disabled={assign.isPending}>
            {t('assign')}
          </Button>
        </div>
      </form>
    </div>
  );
}
