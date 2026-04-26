import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export type ConfidenceHaloIntensity = 'subtle' | 'medium' | 'strong';

export interface ConfidenceHaloProps extends HTMLAttributes<HTMLDivElement> {
  confidence: number;
  children: ReactNode;
  intensity?: ConfidenceHaloIntensity;
}

const INTENSITY_FACTOR: Record<ConfidenceHaloIntensity, { spread: number; alpha: number }> = {
  subtle: { spread: 18, alpha: 0.35 },
  medium: { spread: 28, alpha: 0.55 },
  strong: { spread: 42, alpha: 0.75 },
};

export const ConfidenceHalo = forwardRef<HTMLDivElement, ConfidenceHaloProps>(
  function ConfidenceHalo(
    { confidence, children, intensity = 'medium', className, style, ...rest },
    ref,
  ) {
    const clamped = Math.max(0, Math.min(1, confidence));
    const factor = INTENSITY_FACTOR[intensity];
    const showHalo = clamped >= 0.4;
    const haloAlpha = (clamped * factor.alpha).toFixed(2);
    const haloSpread = Math.round(clamped * factor.spread);

    const containerStyle: CSSProperties = {
      position: 'relative',
      display: 'inline-block',
      borderRadius: 'var(--canon-radius-card)',
      ...(showHalo ? { boxShadow: `0 0 ${haloSpread}px rgba(168, 85, 247, ${haloAlpha})` } : {}),
      ...style,
    };

    return (
      <div
        ref={ref}
        data-canon-variant="confidence-halo"
        data-confidence={clamped.toFixed(2)}
        data-intensity={intensity}
        className={cn('canon-confidence-halo', className)}
        style={containerStyle}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
