'use client';

import { useTranslations } from 'next-intl';
import type { TierGateResult } from '@/shared/lib/intelligence-engine/calculators/tier-gate';
import { cn } from '../primitives/cn';

export interface ScorePlaceholderProps {
  tierGate: TierGateResult;
  scoreId: string;
  isSuperadmin?: boolean;
  forceFlag?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export interface BypassInput {
  readonly gated: boolean;
  readonly isSuperadmin?: boolean;
  readonly forceFlag?: boolean;
}

export function canBypassPlaceholder(input: BypassInput): boolean {
  return Boolean(input.gated && input.isSuperadmin && input.forceFlag);
}

export function ScorePlaceholder({
  tierGate,
  scoreId,
  isSuperadmin = false,
  forceFlag = false,
  children,
  className,
}: ScorePlaceholderProps) {
  const t = useTranslations();

  if (!tierGate.gated) return <>{children}</>;
  if (canBypassPlaceholder({ gated: tierGate.gated, isSuperadmin, forceFlag })) {
    return <>{children}</>;
  }

  const requirement = tierGate.requirement ?? t('ie.placeholder.generic_requirement');

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-6 text-center',
        className,
      )}
      role="status"
      aria-label={`${scoreId}: ${requirement}`}
      data-score-id={scoreId}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-lavender)] text-[var(--color-brand-primary)] text-[var(--text-lg)]"
      >
        ◔
      </span>
      <p className="text-[var(--text-sm)] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
        {t('ie.placeholder.title')}
      </p>
      <p className="text-[var(--text-xs)] text-[var(--color-text-muted)] max-w-xs">{requirement}</p>
    </div>
  );
}
