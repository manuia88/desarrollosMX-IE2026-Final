'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { Button } from '@/shared/ui/primitives/canon';

type Preset = 'hoy' | '7d' | '30d' | '90d' | 'custom';

const PRESETS: ReadonlyArray<Preset> = ['hoy', '7d', '30d', '90d', 'custom'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function subtractDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - days);
  return x;
}

function rangeForPreset(preset: Preset): { rangeFrom: string; rangeTo: string } {
  const today = startOfDay(new Date());
  if (preset === 'hoy') {
    const iso = toIsoDate(today);
    return { rangeFrom: iso, rangeTo: iso };
  }
  if (preset === '7d') {
    return { rangeFrom: toIsoDate(subtractDays(today, 6)), rangeTo: toIsoDate(today) };
  }
  if (preset === '90d') {
    return { rangeFrom: toIsoDate(subtractDays(today, 89)), rangeTo: toIsoDate(today) };
  }
  // 30d default + custom fallback initial value
  return { rangeFrom: toIsoDate(subtractDays(today, 29)), rangeTo: toIsoDate(today) };
}

export function getDefaultRange(): { rangeFrom: string; rangeTo: string } {
  return rangeForPreset('30d');
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(s: string | null): s is string {
  return typeof s === 'string' && DATE_RE.test(s);
}

function isPreset(s: string | null): s is Preset {
  return s !== null && (PRESETS as ReadonlyArray<string>).includes(s);
}

export interface DateRangeSelectorProps {
  readonly className?: string;
}

export function DateRangeSelector({ className }: DateRangeSelectorProps) {
  const t = useTranslations('estadisticas.ranges');
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const presetParam = params.get('preset');
  const fromParam = params.get('from');
  const toParam = params.get('to');

  const initialPreset: Preset = isPreset(presetParam) ? presetParam : '30d';
  const defaults = rangeForPreset(initialPreset === 'custom' ? '30d' : initialPreset);
  const initialFrom = isValidIsoDate(fromParam) ? fromParam : defaults.rangeFrom;
  const initialTo = isValidIsoDate(toParam) ? toParam : defaults.rangeTo;

  const [activePreset, setActivePreset] = useState<Preset>(initialPreset);
  const [customFrom, setCustomFrom] = useState<string>(initialFrom);
  const [customTo, setCustomTo] = useState<string>(initialTo);

  const writeUrl = useCallback(
    (preset: Preset, from: string, to: string) => {
      const next = new URLSearchParams(params.toString());
      next.set('preset', preset);
      next.set('from', from);
      next.set('to', to);
      startTransition(() => {
        router.replace(`?${next.toString()}`, { scroll: false });
      });
    },
    [params, router],
  );

  const handlePreset = useCallback(
    (preset: Preset) => {
      setActivePreset(preset);
      if (preset === 'custom') {
        writeUrl('custom', customFrom, customTo);
        return;
      }
      const r = rangeForPreset(preset);
      setCustomFrom(r.rangeFrom);
      setCustomTo(r.rangeTo);
      writeUrl(preset, r.rangeFrom, r.rangeTo);
    },
    [customFrom, customTo, writeUrl],
  );

  const handleCustomFrom = useCallback(
    (value: string) => {
      setCustomFrom(value);
      if (isValidIsoDate(value) && isValidIsoDate(customTo)) {
        writeUrl('custom', value, customTo);
      }
    },
    [customTo, writeUrl],
  );

  const handleCustomTo = useCallback(
    (value: string) => {
      setCustomTo(value);
      if (isValidIsoDate(customFrom) && isValidIsoDate(value)) {
        writeUrl('custom', customFrom, value);
      }
    },
    [customFrom, writeUrl],
  );

  const presetButtons = useMemo(
    () =>
      PRESETS.map((preset) => {
        const isActive = preset === activePreset;
        return (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant={isActive ? 'primary' : 'ghost'}
            onClick={() => handlePreset(preset)}
            aria-pressed={isActive}
            data-preset={preset}
          >
            {t(preset)}
          </Button>
        );
      }),
    [activePreset, handlePreset, t],
  );

  const containerClass = ['flex', 'flex-wrap', 'items-center', 'gap-3', className]
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset className={containerClass} aria-label={t('aria_label')}>
      <div className="flex flex-wrap gap-2" data-component="DateRangeSelector">
        {presetButtons}
      </div>

      {activePreset === 'custom' ? (
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="flex items-center gap-2 text-[12px]"
            style={{ color: 'var(--canon-cream-2)' }}
          >
            <span>{t('from')}</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => handleCustomFrom(e.target.value)}
              max={customTo}
              className="rounded-[var(--canon-radius-pill)] px-3 py-1 text-[12.5px]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'var(--canon-cream)',
              }}
              aria-label={t('from')}
            />
          </label>
          <label
            className="flex items-center gap-2 text-[12px]"
            style={{ color: 'var(--canon-cream-2)' }}
          >
            <span>{t('to')}</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => handleCustomTo(e.target.value)}
              min={customFrom}
              className="rounded-[var(--canon-radius-pill)] px-3 py-1 text-[12.5px]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: 'var(--canon-cream)',
              }}
              aria-label={t('to')}
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
