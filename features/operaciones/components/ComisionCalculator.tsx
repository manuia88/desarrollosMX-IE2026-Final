'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { OperacionCurrency } from '@/features/operaciones/schemas';
import { formatCurrency } from '@/shared/lib/i18n/formatters';
import { Card } from '@/shared/ui/primitives/canon';

export interface ComisionCalculatorValue {
  comisionPct: number;
  ivaPct: number;
  splitDmxPct: number;
  declaracionJurada: boolean;
}

export interface ComisionCalculatorProps {
  baseAmount: number;
  currency: OperacionCurrency;
  value: ComisionCalculatorValue;
  onChange: (value: ComisionCalculatorValue) => void;
}

function format(amount: number, currency: OperacionCurrency): string {
  return formatCurrency(amount, currency, currency === 'MXN' ? 'es-MX' : 'en-US');
}

export function ComisionCalculator({
  baseAmount,
  currency,
  value,
  onChange,
}: ComisionCalculatorProps) {
  const t = useTranslations('Operaciones');
  const idPct = useId();
  const idIva = useId();
  const idSplit = useId();
  const idDeclaracion = useId();

  const comisionAmount = (baseAmount * value.comisionPct) / 100;
  const ivaAmount = (comisionAmount * value.ivaPct) / 100;
  const totalConIva = comisionAmount + ivaAmount;
  const splitInmobiliaria = comisionAmount * (1 - value.splitDmxPct / 100);
  const splitDmx = comisionAmount * (value.splitDmxPct / 100);

  return (
    <Card variant="elevated" className="p-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--canon-white-pure)]">
        {t('comision.title')}
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label htmlFor={idPct} className="text-xs text-[var(--canon-cream-2)]">
          <span className="block">{t('comision.pctLabel')}</span>
          <input
            id={idPct}
            type="number"
            min={0.25}
            max={20}
            step={0.25}
            value={value.comisionPct}
            onChange={(event) =>
              onChange({ ...value, comisionPct: Number(event.target.value) || 0 })
            }
            className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
          />
        </label>
        <label htmlFor={idIva} className="text-xs text-[var(--canon-cream-2)]">
          <span className="block">{t('comision.ivaLabel')}</span>
          <input
            id={idIva}
            type="number"
            min={0}
            max={100}
            step={1}
            value={value.ivaPct}
            onChange={(event) => onChange({ ...value, ivaPct: Number(event.target.value) || 0 })}
            className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
          />
        </label>
        <label htmlFor={idSplit} className="text-xs text-[var(--canon-cream-2)]">
          <span className="block">{t('comision.splitLabel')}</span>
          <input
            id={idSplit}
            type="number"
            min={0}
            max={100}
            step={1}
            value={value.splitDmxPct}
            onChange={(event) =>
              onChange({ ...value, splitDmxPct: Number(event.target.value) || 0 })
            }
            className="mt-1 w-full rounded-md border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--canon-white-pure)]"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg border border-[var(--canon-border)] bg-[var(--surface-recessed)] p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--canon-cream-2)]">{t('comision.base')}</span>
          <span className="font-semibold text-[var(--canon-white-pure)] tabular-nums">
            {format(baseAmount, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--canon-cream-2)]">
            {t('comision.subtotal', { pct: value.comisionPct.toString() })}
          </span>
          <span className="font-semibold text-[var(--canon-white-pure)] tabular-nums">
            {format(comisionAmount, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--canon-cream-2)]">
            {t('comision.ivaAmount', { pct: value.ivaPct.toString() })}
          </span>
          <span className="font-semibold text-[var(--canon-white-pure)] tabular-nums">
            {format(ivaAmount, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-[var(--canon-border)] pt-2">
          <span className="text-[var(--canon-cream-2)]">{t('comision.total')}</span>
          <span className="font-bold text-[var(--canon-white-pure)] tabular-nums">
            {format(totalConIva, currency)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-lg border border-[var(--canon-card-border-hover)] bg-[var(--surface-spotlight)] p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--canon-cream-2)]">
          {t('comision.splitTitle')}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[var(--canon-cream-2)]">
            {t('comision.splitInmobiliaria', {
              pct: (100 - value.splitDmxPct).toString(),
            })}
          </span>
          <span className="font-semibold text-[var(--canon-white-pure)] tabular-nums">
            {format(splitInmobiliaria, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--canon-cream-2)]">
            {t('comision.splitDmx', { pct: value.splitDmxPct.toString() })}
          </span>
          <span className="font-semibold text-[var(--canon-white-pure)] tabular-nums">
            {format(splitDmx, currency)}
          </span>
        </div>
      </div>

      <label
        htmlFor={idDeclaracion}
        className="mt-4 flex items-start gap-2 text-xs text-[var(--canon-cream-2)]"
      >
        <input
          id={idDeclaracion}
          type="checkbox"
          checked={value.declaracionJurada}
          onChange={(event) => onChange({ ...value, declaracionJurada: event.target.checked })}
          className="mt-0.5"
        />
        <span>{t('comision.declaracionJurada')}</span>
      </label>
    </Card>
  );
}
