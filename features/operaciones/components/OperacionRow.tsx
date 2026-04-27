'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { OperacionStatus } from '@/features/operaciones/schemas';
import { formatCurrency } from '@/shared/lib/i18n/formatters';
import { Card } from '@/shared/ui/primitives/canon';
import { OperacionStatusBadge } from './OperacionStatusBadge';

export interface OperacionRowData {
  id: string;
  codigo: string | null;
  status: OperacionStatus;
  side: string | null;
  cierre_amount: number | string | null;
  cierre_currency: string | null;
  fecha_cierre: string | null;
  completion_pct: number | null;
}

export interface OperacionRowProps {
  operacion: OperacionRowData;
  locale: string;
}

export function OperacionRow({ operacion, locale }: OperacionRowProps) {
  const t = useTranslations('Operaciones');
  const amount =
    typeof operacion.cierre_amount === 'string'
      ? Number(operacion.cierre_amount)
      : (operacion.cierre_amount ?? 0);
  const currency = operacion.cierre_currency ?? 'MXN';
  const completion = operacion.completion_pct ?? 0;

  return (
    <Link href={`/${locale}/asesores/operaciones/${operacion.id}`} className="block">
      <Card
        hoverable
        variant="elevated"
        className="group flex flex-wrap items-center gap-4 px-5 py-4 transition-transform hover:-translate-y-1"
      >
        <div className="flex flex-col">
          <span className="font-mono text-sm font-bold text-[var(--canon-white-pure)] tabular-nums">
            {operacion.codigo ?? '—'}
          </span>
          <span className="text-xs text-[var(--canon-cream-2)]">
            {operacion.side ? t(`side.${operacion.side}.label`) : t('row.sideUnknown')}
          </span>
        </div>
        <div className="flex flex-col items-end ml-auto">
          <span className="text-base font-bold text-[var(--canon-white-pure)] tabular-nums">
            {formatCurrency(amount, currency, locale === 'en-US' ? 'en-US' : 'es-MX')}
          </span>
          <span className="text-xs text-[var(--canon-cream-2)]">
            {operacion.fecha_cierre ?? '—'}
          </span>
        </div>
        <OperacionStatusBadge status={operacion.status} />
        <div className="flex w-32 flex-col items-end" title={t('row.completion')}>
          <span className="text-[10px] uppercase tracking-wide text-[var(--canon-cream-3)]">
            {t('row.completion')}
          </span>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-recessed)]">
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${completion}%`,
                background:
                  'linear-gradient(90deg, var(--canon-indigo-3), var(--canon-pink-3, #ec4899))',
              }}
            />
          </div>
          <span className="mt-1 text-[10px] text-[var(--canon-cream-2)] tabular-nums">
            {completion}%
          </span>
        </div>
      </Card>
    </Link>
  );
}
