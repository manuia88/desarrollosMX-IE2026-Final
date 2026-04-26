import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export type MoodKind = 'high' | 'neutral' | 'low' | 'mixed';

export interface MoodStripeProps extends HTMLAttributes<HTMLDivElement> {
  mood: MoodKind;
  pulse?: boolean;
}

const MOOD_GRADIENT: Record<MoodKind, string> = {
  high: 'linear-gradient(90deg, var(--canon-green), var(--accent-teal))',
  neutral: 'linear-gradient(90deg, var(--canon-indigo), var(--canon-indigo-2))',
  low: 'linear-gradient(90deg, var(--mood-slate-1), var(--mood-slate-2))',
  mixed: 'linear-gradient(90deg, var(--canon-indigo), var(--canon-rose), var(--canon-amber))',
};

export const MoodStripe = forwardRef<HTMLDivElement, MoodStripeProps>(function MoodStripe(
  { mood, pulse = false, className, style, ...rest },
  ref,
) {
  const computedStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    background: MOOD_GRADIENT[mood],
    opacity: 0.85,
    animation: pulse ? 'mood-pulse 1.5s ease-in-out infinite alternate' : 'none',
    ...style,
  };

  return (
    <div
      ref={ref}
      data-canon-variant="mood-stripe"
      data-mood={mood}
      aria-hidden="true"
      className={cn('canon-mood-stripe', className)}
      style={computedStyle}
      {...rest}
    />
  );
});
