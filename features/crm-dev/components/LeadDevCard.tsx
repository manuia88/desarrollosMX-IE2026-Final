'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Card } from '@/shared/ui/primitives/canon';
import { LeadScoreBadge } from './LeadScoreBadge';

export interface LeadDevCardProps {
  readonly lead: {
    readonly id: string;
    readonly contact_name: string;
    readonly contact_email: string | null;
    readonly contact_phone: string | null;
    readonly source_id: string;
    readonly status: string;
    readonly assigned_asesor_id: string | null;
    readonly created_at: string;
    readonly updated_at: string;
    readonly score: number | null;
    readonly tier: 'hot' | 'warm' | 'cold' | null;
  };
  readonly onOpen: (id: string) => void;
  readonly draggable?: boolean;
  readonly onDragStart?: (id: string) => void;
  readonly onDragEnd?: () => void;
}

function daysInStage(updatedAt: string): number {
  const ms = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function LeadDevCard({
  lead,
  onOpen,
  draggable = true,
  onDragStart,
  onDragEnd,
}: LeadDevCardProps) {
  const t = useTranslations('dev.crm');
  const days = daysInStage(lead.updated_at);
  const initials = lead.contact_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const containerStyle: CSSProperties = {
    cursor: 'pointer',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'transform var(--canon-duration-fast) var(--canon-ease-out)',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--canon-cream)',
    margin: 0,
    lineHeight: 1.2,
  };

  const subStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--canon-cream-2)',
    margin: 0,
  };

  const footerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    fontSize: 10,
    color: 'var(--canon-cream-3)',
    fontFamily: 'var(--font-body)',
  };

  const avatarStyle: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(99,102,241,0.15)',
    color: 'var(--canon-indigo-2)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 12,
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(lead.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(lead.id);
        }
      }}
      draggable={draggable}
      onDragStart={(e) => {
        if (draggable && onDragStart) {
          e.dataTransfer.setData('text/plain', lead.id);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart(lead.id);
        }
      }}
      onDragEnd={() => onDragEnd?.()}
      aria-label={t('card.aria', { name: lead.contact_name, days })}
      style={containerStyle}
    >
      <div style={headerStyle}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, flex: 1 }}>
          <span style={avatarStyle} aria-hidden="true">
            {initials || '?'}
          </span>
          <div style={{ minWidth: 0 }}>
            <p style={titleStyle}>{lead.contact_name}</p>
            <p style={subStyle}>
              {lead.contact_email ?? lead.contact_phone ?? t('card.noContact')}
            </p>
          </div>
        </div>
        <LeadScoreBadge score={lead.score} tier={lead.tier} compact />
      </div>
      <div style={footerStyle}>
        <span>{t('card.daysInStage', { days })}</span>
        <span>{lead.assigned_asesor_id ? t('card.assigned') : t('card.unassigned')}</span>
      </div>
    </Card>
  );
}
