'use client';

// F14.F.10 Sprint 9 BIBLIA Upgrade 5 + LATERAL 6 — Photographer commission dashboard.
// Card commission earnings + referrer breakdown + monthly distribution.
// Consume tRPC api.studio.sprint9Photographer.getEarnings.useQuery() (read-only).
// ADR-050 canon: pill buttons, big nums Outfit 800 + tabular-nums, AI gradient para
// commissions destacar, indigo data observada.

import type { CSSProperties } from 'react';
import { isAutoPaymentEnabled } from '@/features/dmx-studio/lib/photographer/commission/payment-processor';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Card, IconCircle } from '@/shared/ui/primitives/canon';

export interface CommissionDashboardProps {
  readonly locale: string;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '24px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '13px',
  lineHeight: 1.55,
};

const labelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const valueStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  lineHeight: 1.05,
  letterSpacing: '-0.01em',
  fontVariantNumeric: 'tabular-nums',
  color: '#FFFFFF',
};

const aiValueStyle: CSSProperties = {
  ...valueStyle,
  background: 'var(--gradient-ai)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '120px',
};

const dollarIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const sparkleIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
  </svg>
);

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

export function CommissionDashboard(_props: CommissionDashboardProps) {
  const earningsQuery = trpc.studio.sprint9Photographer.getEarnings.useQuery();
  const autoPayCheck = isAutoPaymentEnabled();

  const data = earningsQuery.data;
  const isLoading = earningsQuery.isLoading;

  const totalRevenue = data?.totalRevenueUsd ?? 0;
  const commissions = data?.commissionsUsd ?? 0;
  const breakdown = data?.breakdown ?? [];

  return (
    <section
      aria-label="Commission earnings"
      className="flex flex-col gap-5"
      data-testid="commission-dashboard"
    >
      <FadeUp delay={0}>
        <header className="flex flex-col gap-2">
          <h2 style={headingStyle}>Comisiones y ventas</h2>
          <p style={subtitleStyle}>
            Tus ventas de video como fotógrafo y comisiones del programa de referidos (20% del
            primer mes).
          </p>
        </header>
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isLoading ? (
            <>
              <div aria-hidden="true" style={skeletonStyle} />
              <div aria-hidden="true" style={skeletonStyle} />
            </>
          ) : (
            <>
              <Card
                variant="elevated"
                className="flex flex-col gap-3 p-6"
                role="group"
                aria-label="Ventas totales"
                data-testid="commission-total-revenue"
              >
                <div className="flex items-center justify-between gap-3">
                  <span style={labelStyle}>Ventas totales</span>
                  <IconCircle tone="indigo" size="sm" icon={dollarIcon} />
                </div>
                <span style={valueStyle}>{formatUsd(totalRevenue)}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--canon-cream-2)' }}>
                  Ingreso estimado por ventas a clientes
                </span>
              </Card>

              <Card
                variant="spotlight"
                className="flex flex-col gap-3 p-6"
                role="group"
                aria-label="Comisiones de referidos"
                data-testid="commission-referrals-total"
              >
                <div className="flex items-center justify-between gap-3">
                  <span style={labelStyle}>Comisiones de referidos</span>
                  <IconCircle tone="violet" size="sm" icon={sparkleIcon} />
                </div>
                <span style={aiValueStyle}>{formatUsd(commissions)}</span>
                <span style={{ fontSize: '12.5px', color: 'var(--canon-cream-2)' }}>
                  20% del primer mes por cada referido suscrito a Pro
                </span>
              </Card>
            </>
          )}
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <Card
          variant="recessed"
          className="flex flex-col gap-4 p-6"
          aria-label="Detalle comisiones referidos"
          data-testid="commission-breakdown"
        >
          <div className="flex items-center justify-between gap-3">
            <span style={labelStyle}>Detalle por referido</span>
            <span style={{ fontSize: '12px', color: 'var(--canon-cream-2)' }}>
              {breakdown.length} {breakdown.length === 1 ? 'referido' : 'referidos'}
            </span>
          </div>
          {breakdown.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--canon-cream-2)' }}>
              Aún no tienes comisiones de referidos. Invita fotógrafos al programa para ganar 20%
              del primer mes cuando se suscriban.
            </p>
          ) : (
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {breakdown.map((row) => {
                const usd = Number(row.commission_earned_usd ?? 0);
                const acceptedDate = row.accepted_at ? formatDate(row.accepted_at) : '—';
                const rowKey = `${row.accepted_at ?? 'pending'}-${row.commission_earned_usd ?? '0'}`;
                return (
                  <li
                    key={rowKey}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 'var(--canon-radius-card)',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--canon-border)',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--canon-cream)' }}>
                      Aceptado {acceptedDate}
                    </span>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatUsd(usd)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </FadeUp>

      {!autoPayCheck.enabled && (
        <FadeUp delay={0.3}>
          <Card
            variant="recessed"
            className="flex flex-col gap-2 p-4"
            aria-label="Aviso pago manual"
            data-testid="commission-auto-payment-disabled"
            style={{ borderStyle: 'dashed' }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--canon-cream-2)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Pago manual H1
            </span>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--canon-cream-2)',
                lineHeight: 1.55,
              }}
            >
              Los pagos de comisiones se procesan manualmente vía ACH/Wire dentro de los 30 días
              siguientes al cierre de mes. Pago automatizado se activará en H2.
            </p>
          </Card>
        </FadeUp>
      )}
    </section>
  );
}
