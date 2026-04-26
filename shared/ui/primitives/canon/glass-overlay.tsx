import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn';

export interface GlassOverlayProps extends HTMLAttributes<HTMLDivElement> {
  blurPx?: number;
  intensity?: 'subtle' | 'standard' | 'strong';
}

const INTENSITY_STYLES: Record<NonNullable<GlassOverlayProps['intensity']>, CSSProperties> = {
  subtle: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.10)',
  },
  standard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
  },
  strong: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.22)',
  },
};

export const GlassOverlay = forwardRef<HTMLDivElement, GlassOverlayProps>(function GlassOverlay(
  { blurPx = 24, intensity = 'standard', className, style, children, ...rest },
  ref,
) {
  const computedStyle: CSSProperties = {
    position: 'relative',
    borderRadius: 'var(--canon-radius-inner)',
    backdropFilter: `blur(${blurPx}px)`,
    WebkitBackdropFilter: `blur(${blurPx}px)`,
    color: 'var(--canon-cream)',
    ...INTENSITY_STYLES[intensity],
    ...style,
  };
  return (
    <div
      ref={ref}
      className={cn('canon-glass', className)}
      data-canon-intensity={intensity}
      style={computedStyle}
      {...rest}
    >
      {children}
    </div>
  );
});
