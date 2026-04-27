'use client';

import type { ReactNode } from 'react';
import { Card, cn } from '@/shared/ui/primitives/canon';

export interface DevKpiCardProps {
  readonly label: string;
  readonly value: string;
  readonly icon?: ReactNode;
  readonly subtitle?: string;
}

export function DevKpiCard({ label, value, icon, subtitle }: DevKpiCardProps) {
  return (
    <Card
      variant="elevated"
      aria-label={`${label}: ${value}`}
      className={cn('flex flex-col gap-3 p-4')}
    >
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="text-[color:var(--color-text-muted)]" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
          {label}
        </span>
      </div>
      <span
        className="font-[var(--font-outfit)] text-3xl font-extrabold tabular-nums text-[color:var(--canon-cream)]"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </span>
      {subtitle ? (
        <span className="text-xs text-[color:var(--color-text-muted)]">{subtitle}</span>
      ) : null}
    </Card>
  );
}

export default DevKpiCard;
