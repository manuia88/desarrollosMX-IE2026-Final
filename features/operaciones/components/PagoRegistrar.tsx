'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { OPERACION_CURRENCY, type OperacionCurrency } from '@/features/operaciones/schemas';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface PagoRegistrarValues {
  amount: number;
  currency: OperacionCurrency;
  fechaPago: string;
  notes?: string;
}

export interface PagoRegistrarProps {
  defaultCurrency?: OperacionCurrency;
  busy?: boolean;
  onSubmit: (values: PagoRegistrarValues) => void;
}

export function PagoRegistrar({
  defaultCurrency = 'MXN',
  busy = false,
  onSubmit,
}: PagoRegistrarProps) {
  const t = useTranslations('Operaciones');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<OperacionCurrency>(defaultCurrency);
  const [fechaPago, setFechaPago] = useState('');
  const [notes, setNotes] = useState('');
  const idAmount = useId();
  const idCurrency = useId();
  const idFecha = useId();
  const idNotes = useId();

  const handleSubmit = () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;
    if (!fechaPago) return;
    onSubmit({
      amount: numericAmount,
      currency,
      fechaPago,
      ...(notes ? { notes } : {}),
    });
    setAmount('');
    setNotes('');
    setFechaPago('');
  };

  return (
    <Card variant="recessed" className="p-4">
      <p className="text-sm font-semibold text-[var(--canon-white-pure)]">
        {t('pagos.registrarTitle')}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label htmlFor={idAmount} className="text-xs text-[var(--canon-cream-2)]">
          {t('pagos.amountLabel')}
          <input
            id={idAmount}
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
          />
        </label>
        <label htmlFor={idCurrency} className="text-xs text-[var(--canon-cream-2)]">
          {t('pagos.currencyLabel')}
          <select
            id={idCurrency}
            value={currency}
            onChange={(event) => setCurrency(event.target.value as OperacionCurrency)}
            className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
          >
            {OPERACION_CURRENCY.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={idFecha} className="text-xs text-[var(--canon-cream-2)]">
          {t('pagos.fechaLabel')}
          <input
            id={idFecha}
            type="date"
            value={fechaPago}
            onChange={(event) => setFechaPago(event.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
          />
        </label>
        <label htmlFor={idNotes} className="text-xs text-[var(--canon-cream-2)]">
          {t('pagos.notesLabel')}
          <input
            id={idNotes}
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
          />
        </label>
      </div>
      <div className="mt-3">
        <Button
          variant="primary"
          size="md"
          type="button"
          onClick={handleSubmit}
          disabled={busy || !amount || !fechaPago}
          aria-label={t('pagos.submit')}
        >
          {t('pagos.submit')}
        </Button>
      </div>
    </Card>
  );
}
