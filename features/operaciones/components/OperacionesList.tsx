'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import {
  OPERACION_SIDE,
  OPERACION_STATUS,
  type OperacionSide,
  type OperacionStatus,
} from '@/features/operaciones/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { OperacionRow, type OperacionRowData } from './OperacionRow';
import { WizardOperacion } from './WizardOperacion';

export interface OperacionesListProps {
  locale: string;
}

export function OperacionesList({ locale }: OperacionesListProps) {
  const t = useTranslations('Operaciones');
  const [statusFilter, setStatusFilter] = useState<OperacionStatus | ''>('');
  const [sideFilter, setSideFilter] = useState<OperacionSide | ''>('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const filterInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(sideFilter ? { side: sideFilter } : {}),
    limit: 100,
  } as const;
  const listQuery = trpc.operaciones.listOperaciones.useQuery(filterInput);

  const rows = (listQuery.data ?? []) as unknown as OperacionRowData[];
  const isEmpty = !listQuery.isLoading && rows.length === 0;

  return (
    <div
      className="flex flex-col gap-6 px-4 py-6 md:px-6"
      style={{ background: 'var(--canon-bg)' }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-extrabold tracking-tight text-[var(--canon-white-pure)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('list.title')}
          </h1>
          <DisclosurePill tone="violet">{t('list.disclosure')}</DisclosurePill>
        </div>
        <Button
          variant="primary"
          size="md"
          type="button"
          onClick={() => setWizardOpen(true)}
          aria-label={t('list.create')}
        >
          {t('list.create')}
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter((event.target.value as OperacionStatus | '') ?? '')}
          className="rounded-full border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--canon-white-pure)]"
          aria-label={t('list.statusFilter')}
        >
          <option value="">{t('list.allStatuses')}</option>
          {OPERACION_STATUS.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
        <select
          value={sideFilter}
          onChange={(event) => setSideFilter((event.target.value as OperacionSide | '') ?? '')}
          className="rounded-full border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--canon-white-pure)]"
          aria-label={t('list.sideFilter')}
        >
          <option value="">{t('list.allSides')}</option>
          {OPERACION_SIDE.map((s) => (
            <option key={s} value={s}>
              {t(`side.${s}.label`)}
            </option>
          ))}
        </select>
      </div>

      {wizardOpen ? (
        <WizardOperacion
          onCancel={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false);
          }}
        />
      ) : null}

      {listQuery.isLoading ? (
        <Card variant="recessed" className="p-6">
          <p className="text-sm text-[var(--canon-cream-2)]">{t('list.loading')}</p>
        </Card>
      ) : null}

      {listQuery.isError ? (
        <Card variant="recessed" className="p-6">
          <p className="text-sm" role="alert" style={{ color: '#fca5a5' }}>
            {listQuery.error?.message ?? t('list.error')}
          </p>
        </Card>
      ) : null}

      {isEmpty ? (
        <Card variant="recessed" className="p-8 text-center">
          <p className="text-base font-semibold text-[var(--canon-white-pure)]">
            {t('list.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-[var(--canon-cream-2)]">{t('list.emptyHelper')}</p>
          <div className="mt-4">
            <Button
              variant="primary"
              size="md"
              type="button"
              onClick={() => setWizardOpen(true)}
              aria-label={t('list.emptyCta')}
            >
              {t('list.emptyCta')}
            </Button>
          </div>
        </Card>
      ) : null}

      {!listQuery.isLoading && rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <OperacionRow key={row.id} operacion={row} locale={locale} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
