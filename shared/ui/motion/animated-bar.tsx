'use client';

import { type CSSProperties, useRef } from 'react';
import { useInView } from './use-in-view';

export interface AnimatedBarProps {
  value: number;
  max?: number;
  durationMs?: number;
  fillBackground?: string;
  trackBackground?: string;
  glowColor?: string;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export function AnimatedBar({
  value,
  max = 100,
  durationMs = 1200,
  fillBackground = 'var(--gradient-score-good)',
  trackBackground = 'rgba(255,255,255,0.06)',
  glowColor = 'rgba(99,102,241,0.45)',
  height = 6,
  className = '',
  ariaLabel,
}: AnimatedBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  const trackStyle: CSSProperties = {
    background: trackBackground,
    height,
    borderRadius: 9999,
    width: '100%',
    overflow: 'hidden',
  };

  const fillStyle: CSSProperties = {
    background: fillBackground,
    height: '100%',
    width: inView ? `${ratio * 100}%` : '0%',
    transition: `width ${durationMs}ms ${EASE}`,
    boxShadow: `0 0 12px ${glowColor}`,
    borderRadius: 9999,
  };

  if (ariaLabel) {
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel}
        className={className}
        style={trackStyle}
      >
        <div style={fillStyle} aria-hidden="true" />
      </div>
    );
  }
  return (
    <div ref={ref} aria-hidden="true" className={className} style={trackStyle}>
      <div style={fillStyle} />
    </div>
  );
}
