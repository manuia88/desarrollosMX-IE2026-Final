'use client';

// FASE 14.F.2 Sprint 1 — DMX Studio Dashboard stat card.
// ADR-050 canon: Card elevated/spotlight, big numbers Outfit 800 + tabular-nums,
// optional gradient AI tone para señales de scarcity (videosRemaining bajo).

import type { CSSProperties, ReactNode } from 'react';
import { Card } from '@/shared/ui/primitives/canon';

export type StudioStatCardTone = 'default' | 'ai';

export interface StudioStatCardProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly icon?: ReactNode;
  readonly tone?: StudioStatCardTone;
  readonly testId?: string;
}

const valueStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  lineHeight: 1.05,
  letterSpacing: '-0.01em',
  fontVariantNumeric: 'tabular-nums',
};

const aiValueStyle: CSSProperties = {
  ...valueStyle,
  background: 'var(--gradient-ai)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
};

export function StudioStatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  testId,
}: StudioStatCardProps) {
  const variant = tone === 'ai' ? 'spotlight' : 'elevated';
  return (
    <Card
      variant={variant}
      className="flex flex-col gap-3 p-6"
      role="group"
      aria-label={label}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--canon-cream-2)', letterSpacing: '0.05em' }}
        >
          {label}
        </span>
        {icon ? <span aria-hidden="true">{icon}</span> : null}
      </div>
      <span style={tone === 'ai' ? aiValueStyle : { ...valueStyle, color: '#FFFFFF' }}>
        {value}
      </span>
      {hint ? (
        <span className="text-[12.5px]" style={{ color: 'var(--canon-cream-2)' }}>
          {hint}
        </span>
      ) : null}
    </Card>
  );
}
