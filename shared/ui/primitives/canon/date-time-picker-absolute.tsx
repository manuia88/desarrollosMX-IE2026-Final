'use client';

import { type CSSProperties, forwardRef, useCallback, useMemo } from 'react';
import { cn } from './cn';

export interface DateTimePickerAbsoluteProps {
  value: string;
  onChange: (isoString: string) => void;
  ariaLabelDate: string;
  ariaLabelTime: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function isoToDateTimeParts(iso: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const trimmed = iso.length >= 16 ? iso.slice(0, 16) : iso;
  const [datePart, timePart] = trimmed.split('T');
  return { date: datePart ?? '', time: timePart ?? '' };
}

function partsToIso(date: string, time: string): string {
  if (!date || !time) return '';
  const trimmedTime = time.length >= 5 ? time.slice(0, 5) : time;
  const composed = new Date(`${date}T${trimmedTime}:00`);
  if (Number.isNaN(composed.getTime())) return '';
  return composed.toISOString();
}

const inputStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: 'var(--canon-radius-pill)',
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  padding: '8px 14px',
  minWidth: 160,
  fontVariantNumeric: 'tabular-nums',
};

export const DateTimePickerAbsolute = forwardRef<HTMLDivElement, DateTimePickerAbsoluteProps>(
  function DateTimePickerAbsolute(
    { value, onChange, ariaLabelDate, ariaLabelTime, minDate, maxDate, disabled, className, id },
    ref,
  ) {
    const { date, time } = useMemo(() => isoToDateTimeParts(value), [value]);
    const dateId = id ? `${id}-date` : undefined;
    const timeId = id ? `${id}-time` : undefined;

    const handleDateChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = partsToIso(event.target.value, time || '00:00');
        if (next) onChange(next);
      },
      [time, onChange],
    );

    const handleTimeChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const next = partsToIso(date, event.target.value);
        if (next) onChange(next);
      },
      [date, onChange],
    );

    return (
      <div ref={ref} className={cn('flex flex-wrap items-center gap-2', className)}>
        <input
          {...(dateId ? { id: dateId } : {})}
          type="date"
          value={date}
          onChange={handleDateChange}
          aria-label={ariaLabelDate}
          {...(minDate ? { min: minDate } : {})}
          {...(maxDate ? { max: maxDate } : {})}
          disabled={disabled}
          style={inputStyle}
        />
        <input
          {...(timeId ? { id: timeId } : {})}
          type="time"
          value={time}
          onChange={handleTimeChange}
          aria-label={ariaLabelTime}
          disabled={disabled}
          style={inputStyle}
        />
      </div>
    );
  },
);
