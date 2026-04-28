'use client';

import { useTranslations } from 'next-intl';
import type { OperacionCurrency, OperacionStatus } from '@/features/operaciones/schemas';
import { formatCurrency } from '@/shared/lib/i18n/formatters';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { CFDIViewer } from './CFDIViewer';
import { LegalFlowIndicator } from './LegalFlowIndicator';
import { OperacionStatusBadge } from './OperacionStatusBadge';
import { PagoRegistrar } from './PagoRegistrar';
import type { ChangeStatusPayload } from './StatusChanger';
import { StatusChanger } from './StatusChanger';

export interface OperacionDetailProps {
  operacionId: string;
  locale: string;
}

export function OperacionDetail({ operacionId, locale }: OperacionDetailProps) {
  const t = useTranslations('Operaciones');
  const utils = trpc.useUtils();
  const detail = trpc.operaciones.getById.useQuery({ id: operacionId });
  const updateStatus = trpc.operaciones.updateStatus.useMutation({
    onSuccess: async () => {
      await utils.operaciones.getById.invalidate({ id: operacionId });
    },
  });
  const registerPago = trpc.operaciones.registerPago.useMutation({
    onSuccess: async () => {
      await utils.operaciones.getById.invalidate({ id: operacionId });
    },
  });

  if (detail.isLoading) {
    return (
      <div className="px-4 py-6">
        <Card variant="recessed" className="p-6">
          <p className="text-sm text-[var(--canon-cream-2)]">{t('detail.loading')}</p>
        </Card>
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <div className="px-4 py-6">
        <Card variant="recessed" className="p-6">
          <p className="text-sm" role="alert" style={{ color: '#fca5a5' }}>
            {detail.error?.message ?? t('detail.error')}
          </p>
        </Card>
      </div>
    );
  }

  const op = detail.data.operacion;
  const status = op.status as OperacionStatus;
  const currency = (op.cierre_currency ?? 'MXN') as OperacionCurrency;
  const cierreAmount =
    typeof op.cierre_amount === 'string' ? Number(op.cierre_amount) : (op.cierre_amount ?? 0);

  const handleChangeStatus = (next: OperacionStatus, payload: ChangeStatusPayload) => {
    updateStatus.mutate({ id: operacionId, newStatus: next, ...payload });
  };

  return (
    <div
      className="flex flex-col gap-5 px-4 py-6 md:px-6"
      style={{ background: 'var(--canon-bg)' }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-extrabold tracking-tight text-[var(--canon-white-pure)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="font-mono tabular-nums">{op.codigo ?? '—'}</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--canon-cream-2)]">
            {t('detail.created', { date: op.created_at })}
          </p>
        </div>
        <OperacionStatusBadge status={status} />
      </header>

      <Card variant="elevated" className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--canon-cream-2)]">
          {t('detail.summary')}
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs text-[var(--canon-cream-3)]">{t('detail.cierreAmount')}</p>
            <p className="mt-1 text-base font-bold text-[var(--canon-white-pure)] tabular-nums">
              {formatCurrency(cierreAmount, currency, locale === 'en-US' ? 'en-US' : 'es-MX')}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--canon-cream-3)]">{t('detail.fechaCierre')}</p>
            <p className="mt-1 text-base font-bold text-[var(--canon-white-pure)]">
              {op.fecha_cierre ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--canon-cream-3)]">{t('detail.completion')}</p>
            <p className="mt-1 text-base font-bold text-[var(--canon-white-pure)] tabular-nums">
              {op.completion_pct ?? 0}%
            </p>
          </div>
        </div>
      </Card>

      <Card variant="elevated" className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--canon-cream-2)]">
          {t('detail.parts')}
        </h2>
        {detail.data.parts.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--canon-cream-3)]">{t('detail.partsEmpty')}</p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {detail.data.parts.map((part) => (
              <li
                key={part.id}
                className="rounded-md border border-[var(--canon-border)] bg-[var(--surface-recessed)] p-3 text-xs text-[var(--canon-cream-2)]"
              >
                <span className="font-semibold uppercase tracking-wide text-[var(--canon-white-pure)]">
                  {t(`partsRoles.${part.role}`)}
                </span>
                <p className="mt-1 break-all">{part.asesor_id ?? part.contacto_id ?? '—'}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {detail.data.commission ? (
        <Card variant="elevated" className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--canon-cream-2)]">
            {t('detail.commission')}
          </h2>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--canon-cream-2)]">
                {t('comision.subtotal', {
                  pct: String(detail.data.commission.comision_pct),
                })}
              </span>
              <span className="font-semibold text-[var(--canon-white-pure)] tabular-nums">
                {formatCurrency(
                  Number(detail.data.commission.comision_amount ?? 0),
                  detail.data.commission.currency,
                  'es-MX',
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--canon-cream-2)]">{t('comision.total')}</span>
              <span className="font-bold text-[var(--canon-white-pure)] tabular-nums">
                {formatCurrency(
                  Number(detail.data.commission.total_with_iva ?? 0),
                  detail.data.commission.currency,
                  'es-MX',
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--canon-cream-2)]">
                {t('comision.splitDmx', {
                  pct: String(detail.data.commission.split_dmx_pct),
                })}
              </span>
              <span className="font-semibold text-[var(--canon-white-pure)] tabular-nums">
                {formatCurrency(
                  Number(detail.data.commission.split_dmx_amount ?? 0),
                  detail.data.commission.currency,
                  'es-MX',
                )}
              </span>
            </div>
          </div>
        </Card>
      ) : null}

      <StatusChanger
        currentStatus={status}
        busy={updateStatus.isPending}
        onChange={handleChangeStatus}
      />

      <Card variant="elevated" className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--canon-cream-2)]">
          {t('detail.pagos')}
        </h2>
        {detail.data.pagos.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--canon-cream-3)]">{t('detail.pagosEmpty')}</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {detail.data.pagos.map((pago) => (
              <li
                key={pago.id}
                className="flex items-center justify-between rounded-md border border-[var(--canon-border)] bg-[var(--surface-recessed)] p-3 text-xs text-[var(--canon-cream-2)]"
              >
                <span>
                  {pago.fecha_pago} · {t(`pagos.estado.${pago.estado_pago}`)}
                </span>
                <span className="font-semibold text-[var(--canon-white-pure)] tabular-nums">
                  {formatCurrency(Number(pago.amount), pago.currency, 'es-MX')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <PagoRegistrar
            defaultCurrency={currency}
            busy={registerPago.isPending}
            onSubmit={(values) =>
              registerPago.mutate({
                operacionId,
                amount: values.amount,
                currency: values.currency,
                fechaPago: values.fechaPago,
                estadoPago: 'pending',
                ...(values.notes ? { notes: values.notes } : {}),
              })
            }
          />
        </div>
      </Card>

      <LegalFlowIndicator />
      <CFDIViewer />

      {op.notas ? (
        <Card variant="recessed" className="p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--canon-cream-2)]">
            {t('detail.notas')}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--canon-white-pure)]">
            {op.notas}
          </p>
        </Card>
      ) : null}

      <div className="flex justify-start gap-3">
        <Button
          variant="ghost"
          size="md"
          type="button"
          onClick={() => detail.refetch()}
          aria-label={t('detail.refresh')}
        >
          {t('detail.refresh')}
        </Button>
        <Button
          variant="primary"
          size="md"
          type="button"
          aria-label="Subir video presentación propiedad a Studio"
          onClick={() => {
            window.location.assign(
              `/${locale}/studio-app/raw-video/new?from_operacion=${operacionId}`,
            );
          }}
        >
          Subir video presentación
        </Button>
      </div>
    </div>
  );
}
