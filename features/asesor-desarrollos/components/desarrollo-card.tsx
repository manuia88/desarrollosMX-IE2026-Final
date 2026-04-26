'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import {
  Card,
  directionFromDelta,
  MomentumPill,
  ScorePill,
  tierFromScore,
} from '@/shared/ui/primitives/canon';
import type { DesarrolloSummary } from '../lib/desarrollos-loader';
import { ExclusividadBadge } from './exclusividad-badge';
import { PhotoPlaceholder } from './photo-placeholder';
import { QualityScoreBadge } from './quality-score-badge';

export interface DesarrolloCardProps {
  project: DesarrolloSummary;
  onOpen?: (id: string) => void;
}

function formatPrice(value: number | null, currency: string): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M ${currency}`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K ${currency}`;
  return `$${value.toFixed(0)} ${currency}`;
}

export function DesarrolloCard({ project, onOpen }: DesarrolloCardProps) {
  const t = useTranslations('AsesorDesarrollos');

  const containerStyle: CSSProperties = {
    overflow: 'hidden',
    cursor: onOpen ? 'pointer' : 'default',
    transition:
      'transform var(--canon-duration-fast) var(--canon-ease-out), box-shadow var(--canon-duration-fast) var(--canon-ease-out)',
  };

  const photoWrapperStyle: CSSProperties = {
    position: 'relative',
  };

  const overlayBaseStyle: CSSProperties = {
    position: 'absolute',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };

  const bodyStyle: CSSProperties = {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    fontWeight: 800,
    color: 'var(--canon-cream)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const ubicacionStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--canon-cream-2)',
    margin: 0,
  };

  const priceStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--canon-cream)',
    fontVariantNumeric: 'tabular-nums',
    margin: 0,
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid var(--canon-border)',
  };

  const ubicacion = [project.colonia, project.ciudad].filter(Boolean).join(' · ');
  const priceLabel = project.priceFrom
    ? t('card.priceFrom', { amount: formatPrice(project.priceFrom, project.currency) })
    : '—';

  return (
    <Card
      variant="default"
      data-card-id={project.id}
      style={containerStyle}
      onClick={onOpen ? () => onOpen(project.id) : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(project.id);
              }
            }
          : undefined
      }
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      aria-label={t('card.ariaOpen', { name: project.name })}
    >
      <div style={photoWrapperStyle}>
        <PhotoPlaceholder ariaLabel={t('disclosure.photoPlaceholder')} />
        {project.dmxScore !== null ? (
          <div style={{ ...overlayBaseStyle, top: 12, left: 12 }}>
            <ScorePill tier={tierFromScore(project.dmxScore)}>
              {t('card.score', { value: project.dmxScore.toFixed(1) })}
            </ScorePill>
          </div>
        ) : null}
        {project.exclusividad ? (
          <div style={{ ...overlayBaseStyle, top: 12, right: 12 }}>
            <ExclusividadBadge
              mesesExclusividad={project.exclusividad.mesesExclusividad}
              mesesContrato={project.exclusividad.mesesContrato}
              comisionPct={project.exclusividad.comisionPct}
            />
          </div>
        ) : null}
      </div>

      <div style={bodyStyle}>
        {project.momentumDelta !== null ? (
          <MomentumPill direction={directionFromDelta(project.momentumDelta)}>
            {project.momentumDelta > 0
              ? `+${project.momentumDelta.toFixed(1)}`
              : project.momentumDelta.toFixed(1)}
          </MomentumPill>
        ) : null}
        <h3 style={titleStyle}>{project.name}</h3>
        {ubicacion ? <p style={ubicacionStyle}>{ubicacion}</p> : null}
        <p style={priceStyle}>{priceLabel}</p>
      </div>

      <div style={footerStyle}>
        <QualityScoreBadge score={project.qualityScore} />
        <span
          style={{
            fontSize: 11,
            color: 'var(--canon-cream-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {project.unitsAvailable !== null
            ? t('card.unitsAvailable', { count: project.unitsAvailable })
            : ''}
        </span>
      </div>
    </Card>
  );
}
