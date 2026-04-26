'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';
import type { BusquedaSummary } from '../lib/busquedas-loader';

export interface BusquedaCardProps {
  busqueda: BusquedaSummary;
  onOpen?: (id: string) => void;
}

function formatPrice(value: number | undefined, currency: string): string {
  if (value === undefined || value === null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M ${currency}`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K ${currency}`;
  return `$${value.toFixed(0)} ${currency}`;
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return '—';
  return date.toISOString().slice(0, 10);
}

export function BusquedaCard({ busqueda, onOpen }: BusquedaCardProps) {
  const t = useTranslations('AsesorBusquedas.card');
  const tCriteria = useTranslations('AsesorBusquedas.criteria');

  const containerStyle: CSSProperties = {
    overflow: 'hidden',
    cursor: onOpen ? 'pointer' : 'default',
    transition:
      'transform var(--canon-duration-fast) var(--canon-ease-out), box-shadow var(--canon-duration-fast) var(--canon-ease-out)',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--canon-cream)',
    margin: 0,
    lineHeight: 1.2,
  };

  const subtitleStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--canon-cream-2)',
    margin: 0,
  };

  const matchPillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    background: 'var(--mod-busquedas, var(--canon-gradient))',
    color: '#fff',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
  };

  const chipsRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  };

  const chipStyle: CSSProperties = {
    display: 'inline-flex',
    padding: '3px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg-2)',
    color: 'var(--canon-cream-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 500,
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTop: '1px solid var(--canon-border)',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--canon-cream-3)',
  };

  const { criteria } = busqueda;
  const priceRange =
    criteria.price_min !== undefined || criteria.price_max !== undefined
      ? `${formatPrice(criteria.price_min, criteria.currency)} – ${formatPrice(criteria.price_max, criteria.currency)}`
      : t('priceAny');
  const recamarasLabel =
    criteria.recamaras_min !== undefined || criteria.recamaras_max !== undefined
      ? `${criteria.recamaras_min ?? 0}–${criteria.recamaras_max ?? '+'}  ${t('rooms')}`
      : t('roomsAny');

  return (
    <Card
      variant="default"
      data-card-id={busqueda.id}
      style={containerStyle}
      onClick={onOpen ? () => onOpen(busqueda.id) : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(busqueda.id);
              }
            }
          : undefined
      }
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      aria-label={t('ariaOpen', { name: busqueda.leadName ?? '' })}
    >
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>{busqueda.leadName ?? t('leadUnknown')}</h3>
          <p style={subtitleStyle}>{priceRange}</p>
        </div>
        <span
          style={matchPillStyle}
          role="img"
          aria-label={t('ariaMatched', { count: busqueda.matchedCount })}
        >
          <span aria-hidden="true">{busqueda.matchedCount}</span>
          <span aria-hidden="true" style={{ fontSize: 10, fontWeight: 500, opacity: 0.85 }}>
            {t('matchedAbbr')}
          </span>
        </span>
      </div>

      <div style={chipsRowStyle}>
        {criteria.tipo ? <span style={chipStyle}>{tCriteria(`tipo.${criteria.tipo}`)}</span> : null}
        <span style={chipStyle}>{tCriteria(`operacion.${criteria.operacion}`)}</span>
        <span style={chipStyle}>{recamarasLabel}</span>
        {criteria.ciudades.slice(0, 2).map((c) => (
          <span key={c} style={chipStyle}>
            {c}
          </span>
        ))}
        {criteria.amenities.slice(0, 2).map((a) => (
          <span key={a} style={chipStyle}>
            {a}
          </span>
        ))}
      </div>

      <div style={footerStyle}>
        <span>
          {t('lastRunAt')}: {formatDateShort(busqueda.lastRunAt)}
        </span>
        <span>
          {t('createdAt')}: {formatDateShort(busqueda.createdAt)}
        </span>
      </div>
    </Card>
  );
}
