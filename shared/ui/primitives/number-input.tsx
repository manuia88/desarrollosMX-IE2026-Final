'use client';

import { forwardRef, useMemo } from 'react';
import { Input, type InputProps } from './input';

export interface NumberInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value?: number | null;
  onChange?: (value: number | null) => void;
  currency?: string;
  locale?: string;
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, currency, locale = 'es-MX', min, max, step, ...props },
  ref,
) {
  const formatter = useMemo(() => {
    if (!currency) return null;
    return new Intl.NumberFormat(locale, { style: 'currency', currency });
  }, [currency, locale]);

  const displayValue =
    value == null
      ? ''
      : formatter && document.activeElement?.getAttribute('data-nif') !== 'active'
        ? formatter.format(value)
        : String(value);

  return (
    <Input
      ref={ref}
      type={currency ? 'text' : 'number'}
      inputMode="decimal"
      data-nif="active"
      value={displayValue}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.-]/g, '');
        if (raw === '' || raw === '-') {
          onChange?.(null);
          return;
        }
        const parsed = Number(raw);
        if (!Number.isNaN(parsed)) onChange?.(parsed);
      }}
      {...props}
    />
  );
});
