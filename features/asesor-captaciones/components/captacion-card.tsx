'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card, ScorePill, tierFromScore } from '@/shared/ui/primitives/canon';
import type { CaptacionSummary } from '../lib/captaciones-loader';
import { StatusBadge } from './status-badge';

export interface CaptacionCardProps {
  captacion: CaptacionSummary;
  onOpen?: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
}

function formatPrice(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M ${currency}`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K ${currency}`;
  return `$${value.toFixed(0)} ${currency}`;
}

export function CaptacionCard({
  captacion,
  onOpen,
  draggable = false,
  onDragStart,
  onDragEnd,
}: CaptacionCardProps) {
  const t = useTranslations('AsesorCaptaciones.card');

  const containerStyle: CSSProperties = {
    overflow: 'hidden',
    cursor: onOpen ? 'pointer' : 'default',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    transition:
      'transform var(--canon-duration-fast) var(--canon-ease-out), box-shadow var(--canon-duration-fast) var(--canon-ease-out)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 14,
    fontWeight: 800,
    color: 'var(--canon-cream)',
    margin: 0,
    lineHeight: 1.2,
  };

  const subtitleStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--canon-cream-2)',
    margin: 0,
    lineHeight: 1.3,
  };

  const priceStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--mod-captaciones, var(--canon-cream))',
    fontVariantNumeric: 'tabular-nums',
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 6,
    borderTop: '1px solid var(--canon-border)',
    fontSize: 10,
    color: 'var(--canon-cream-3)',
  };

  return (
    <Card
      variant="default"
      data-captacion-id={captacion.id}
      style={containerStyle}
      onClick={onOpen ? () => onOpen(captacion.id) : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(captacion.id);
              }
            }
          : undefined
      }
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      aria-label={t('ariaOpen', { name: captacion.propietarioNombre })}
      draggable={draggable}
      onDragStart={
        draggable && onDragStart
          ? (e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/captacion-id', captacion.id);
              onDragStart(captacion.id);
            }
          : undefined
      }
      onDragEnd={draggable && onDragEnd ? onDragEnd : undefined}
    >
      <div style={headerStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={titleStyle}>{captacion.propietarioNombre}</h3>
          <p style={subtitleStyle}>{captacion.direccion}</p>
        </div>
        <StatusBadge status={captacion.status} />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={priceStyle}>
          {formatPrice(captacion.precioSolicitado, captacion.currency)}
        </span>
        <span
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--canon-cream-3)',
          }}
        >
          {t(`tipo.${captacion.tipoOperacion}`)}
        </span>
      </div>

      {captacion.acmResult ? (
        <ScorePill tier={tierFromScore(captacion.acmResult.score)}>
          ACM {captacion.acmResult.score}
        </ScorePill>
      ) : null}

      <div style={footerStyle}>
        <span>
          {t('createdAt')}: {captacion.createdAt.slice(0, 10)}
        </span>
        {captacion.ciudad ? <span>{captacion.ciudad}</span> : null}
      </div>
    </Card>
  );
}
