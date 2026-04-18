import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../primitives/cn';

export type LabelPillTone = 'primary' | 'warm' | 'cool' | 'fresh' | 'sunset' | 'iridescent';
export type LabelPillSize = 'sm' | 'md' | 'lg';

export interface LabelPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: LabelPillTone;
  size?: LabelPillSize;
  icon?: ReactNode;
}

const tones: Record<LabelPillTone, string> = {
  primary: 'bg-[var(--gradient-p)] shadow-[var(--shadow-glow-primary)]',
  warm: 'bg-[var(--gradient-warm)] shadow-[var(--shadow-glow-warm)]',
  cool: 'bg-[var(--gradient-cool)] shadow-[var(--shadow-glow-cool)]',
  fresh: 'bg-[var(--gradient-fresh)] shadow-[var(--shadow-glow-cool)]',
  sunset: 'bg-[var(--gradient-sunset)] shadow-[var(--shadow-glow-warm)]',
  iridescent:
    'bg-[var(--gradient-iridescent)] bg-[length:200%_200%] animate-[grad-shift_4s_ease-in-out_infinite] shadow-[var(--shadow-glow-primary)]',
};

const sizes: Record<LabelPillSize, string> = {
  sm: 'h-5 px-2 text-[10px] gap-1',
  md: 'h-6 px-2.5 text-xs gap-1.5',
  lg: 'h-8 px-3.5 text-sm gap-2',
};

export function LabelPill({
  tone = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: LabelPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] font-[var(--font-weight-semibold)] tracking-wide uppercase text-[var(--color-text-inverse)] whitespace-nowrap',
        tones[tone],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}
