'use client';

import { type ReactNode, useId } from 'react';

export interface MarqueeProps {
  children: ReactNode;
  direction?: 'left' | 'right';
  durationS?: number;
  pauseOnHover?: boolean;
  className?: string;
  doubleRow?: boolean;
}

export function Marquee({
  children,
  direction = 'left',
  durationS = 30,
  pauseOnHover = true,
  className = '',
  doubleRow = false,
}: MarqueeProps) {
  const id = useId().replace(/:/g, '');
  const animationName = direction === 'left' ? 'canon-marquee-left' : 'canon-marquee-right';
  const styleSheet = `
    .marquee-${id} {
      overflow: hidden;
      width: 100%;
      position: relative;
    }
    .marquee-${id}-track {
      display: inline-flex;
      gap: 24px;
      animation: ${animationName} ${durationS}s linear infinite;
      will-change: transform;
    }
    ${
      pauseOnHover
        ? `.marquee-${id}:hover .marquee-${id}-track { animation-play-state: paused; }`
        : ''
    }
    @media (prefers-reduced-motion: reduce) {
      .marquee-${id}-track { animation: none; }
    }
  `;

  return (
    <div className={`marquee-${id} ${className}`.trim()}>
      <style>{styleSheet}</style>
      <div className={`marquee-${id}-track`}>
        <div style={{ display: 'inline-flex', gap: '24px', flexShrink: 0 }}>{children}</div>
        <div style={{ display: 'inline-flex', gap: '24px', flexShrink: 0 }} aria-hidden="true">
          {children}
        </div>
      </div>
      {doubleRow ? (
        <div
          className={`marquee-${id}-track`}
          style={{ marginTop: '12px', animationDirection: 'reverse' }}
          aria-hidden="true"
        >
          <div style={{ display: 'inline-flex', gap: '24px', flexShrink: 0 }}>{children}</div>
          <div style={{ display: 'inline-flex', gap: '24px', flexShrink: 0 }}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}
