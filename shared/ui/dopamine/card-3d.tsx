'use client';

import { useReducedMotion } from 'framer-motion';
import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useRef } from 'react';
import { cn } from '../primitives/cn';

export interface Card3DProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Enable mouse-tracking 3D tilt (rotateX/Y ±12° + scale 1.02).
   * @default false — Do NOT enable in Dopamine module usage (M1-M10 founder preference).
   *                  Reserve for hero cards, pricing tiers, and one-off showcases.
   */
  tilt?: boolean;
  /** Max degrees of rotation. @default 12 */
  intensity?: number;
  children: ReactNode;
}

export function Card3D({
  tilt = false,
  intensity = 12,
  className,
  children,
  onMouseMove,
  onMouseLeave,
  ...props
}: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const tiltActive = tilt && !reducedMotion;

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    onMouseMove?.(e);
    if (!tiltActive || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) scale(1.02)`;
  };

  const handleLeave = (e: MouseEvent<HTMLDivElement>) => {
    onMouseLeave?.(e);
    if (!tiltActive || !ref.current) return;
    ref.current.style.transform = '';
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: visual-only mouse tilt, no click/keyboard affordance
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={cn('will-change-transform', className)}
      style={{
        transition: 'transform 250ms var(--ease-dopamine)',
        transformStyle: tiltActive ? 'preserve-3d' : undefined,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
