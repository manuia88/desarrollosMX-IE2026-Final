'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  isStatusTransitionValid,
  type OperacionStatus,
  STATUS_TRANSITIONS,
} from '@/features/operaciones/schemas';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface StatusChangerProps {
  currentStatus: OperacionStatus;
  busy?: boolean;
  onChange: (next: OperacionStatus, payload: ChangeStatusPayload) => void;
}

export interface ChangeStatusPayload {
  motivo?: string;
  firmaSimple?: boolean;
  legalFlowInitiated?: boolean;
  mifielCompleted?: boolean;
}

export function StatusChanger({ currentStatus, onChange, busy = false }: StatusChangerProps) {
  const t = useTranslations('Operaciones');
  const [next, setNext] = useState<OperacionStatus | ''>('');
  const [motivo, setMotivo] = useState('');
  const [firmaSimple, setFirmaSimple] = useState(false);
  const [legalFlow, setLegalFlow] = useState(false);
  const [mifielCompleted, setMifielCompleted] = useState(false);

  const allowed = STATUS_TRANSITIONS[currentStatus];

  const handleSubmit = () => {
    if (!next || !isStatusTransitionValid(currentStatus, next)) return;
    if (next === 'cancelada' && motivo.length < 10) return;
    const payload: ChangeStatusPayload = {};
    if (motivo) payload.motivo = motivo;
    if (firmaSimple) payload.firmaSimple = true;
    if (legalFlow) payload.legalFlowInitiated = true;
    if (mifielCompleted) payload.mifielCompleted = true;
    onChange(next, payload);
  };

  if (allowed.length === 0) {
    return (
      <Card variant="recessed" className="p-3">
        <p className="text-xs text-[var(--canon-cream-2)]">{t('status.terminal')}</p>
      </Card>
    );
  }

  return (
    <Card variant="recessed" className="p-4">
      <p className="text-sm font-semibold text-[var(--canon-white-pure)]">
        {t('status.changerTitle')}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {allowed.map((option) => {
          const active = next === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setNext(option)}
              className="rounded-full border px-3 py-1.5 text-xs"
              style={{
                background: active ? 'var(--canon-indigo-3)' : 'var(--surface-elevated)',
                color: active ? 'var(--canon-bg)' : 'var(--canon-white-pure)',
                borderColor: active ? 'var(--canon-indigo-3)' : 'var(--canon-border)',
              }}
            >
              {t(`status.${option}`)}
            </button>
          );
        })}
      </div>
      {next === 'oferta_aceptada' ? (
        <label className="mt-3 flex items-center gap-2 text-xs text-[var(--canon-cream-2)]">
          <input
            type="checkbox"
            checked={firmaSimple}
            onChange={(event) => setFirmaSimple(event.target.checked)}
          />
          {t('status.requireFirmaSimple')}
        </label>
      ) : null}
      {next === 'escritura' ? (
        <label className="mt-3 flex items-center gap-2 text-xs text-[var(--canon-cream-2)]">
          <input
            type="checkbox"
            checked={legalFlow}
            onChange={(event) => setLegalFlow(event.target.checked)}
          />
          {t('status.requireLegalFlow')}
        </label>
      ) : null}
      {next === 'cerrada' ? (
        <label className="mt-3 flex items-center gap-2 text-xs text-[var(--canon-cream-2)]">
          <input
            type="checkbox"
            checked={mifielCompleted}
            onChange={(event) => setMifielCompleted(event.target.checked)}
          />
          {t('status.requireMifiel')}
        </label>
      ) : null}
      {next === 'cancelada' ? (
        <textarea
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder={t('status.motivoPlaceholder')}
          className="mt-3 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
          rows={2}
          aria-label={t('status.motivoLabel')}
        />
      ) : null}
      <div className="mt-3">
        <Button
          variant="primary"
          size="md"
          type="button"
          onClick={handleSubmit}
          disabled={!next || busy}
          aria-label={t('status.submit')}
        >
          {t('status.submit')}
        </Button>
      </div>
    </Card>
  );
}
