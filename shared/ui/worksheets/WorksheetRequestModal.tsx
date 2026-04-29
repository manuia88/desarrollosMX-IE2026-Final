'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

export interface WorksheetRequestModalProps {
  unitId: string;
  unitLabel?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
  clientFirstName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  clientFirstName: '',
  clientPhone: '',
  clientEmail: '',
  notes: '',
};

export function WorksheetRequestModal({
  unitId,
  unitLabel,
  isOpen,
  onClose,
  onSuccess,
}: WorksheetRequestModalProps) {
  const t = useTranslations('dev.worksheets.requestModal');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const utils = trpc.useUtils();
  const requestMutation = trpc.worksheets.requestWorksheet.useMutation({
    onSuccess: () => {
      utils.worksheets.listMyWorksheets.invalidate().catch(() => undefined);
      setForm(INITIAL_FORM);
      setError(null);
      onSuccess?.();
      onClose();
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!form.clientFirstName.trim()) {
      setError(t('errors.firstNameRequired'));
      return;
    }
    requestMutation.mutate({
      unitId,
      clientFirstName: form.clientFirstName.trim(),
      ...(form.clientPhone.trim() ? { clientPhone: form.clientPhone.trim() } : {}),
      ...(form.clientEmail.trim() ? { clientEmail: form.clientEmail.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    });
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
          width: 'min(480px, 100%)',
          background: 'var(--surface-elevated)',
          color: 'var(--canon-cream)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid var(--canon-border-2)',
          boxShadow: 'var(--shadow-canon-spotlight)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {t('title')}
        </h2>
        {unitLabel ? (
          <p style={{ margin: 0, color: 'var(--canon-cream-2)', fontSize: 13 }}>{unitLabel}</p>
        ) : null}
        <p style={{ margin: 0, color: 'var(--canon-cream-3)', fontSize: 12 }}>{t('subtitle')}</p>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          {t('fields.firstName')}
          <input
            type="text"
            value={form.clientFirstName}
            onChange={(e) => setForm((s) => ({ ...s, clientFirstName: e.target.value }))}
            required
            maxLength={80}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          {t('fields.phone')}
          <input
            type="tel"
            value={form.clientPhone}
            onChange={(e) => setForm((s) => ({ ...s, clientPhone: e.target.value }))}
            maxLength={40}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          {t('fields.email')}
          <input
            type="email"
            value={form.clientEmail}
            onChange={(e) => setForm((s) => ({ ...s, clientEmail: e.target.value }))}
            maxLength={160}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          {t('fields.notes')}
          <textarea
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            maxLength={800}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        {error ? (
          <p role="alert" style={{ margin: 0, color: 'var(--canon-rose)', fontSize: 12 }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={requestMutation.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={requestMutation.isPending}>
            {requestMutation.isPending ? t('actions.submitting') : t('actions.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}

const inputStyle = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border-2)',
  borderRadius: 8,
  color: 'var(--canon-cream)',
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'inherit',
} as const;
