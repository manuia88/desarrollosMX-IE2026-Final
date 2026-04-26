'use client';

import { Children, type CSSProperties, type ReactNode, useRef } from 'react';
import { useInView } from './use-in-view';

export interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerMs?: number;
  delay?: number;
  durationMs?: number;
  distance?: number;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function StaggerContainer({
  children,
  className = '',
  staggerMs = 80,
  delay = 0,
  durationMs = 600,
  distance = 16,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const items = Children.toArray(children);

  return (
    <div ref={ref} className={className}>
      {items.map((child, i) => {
        const itemDelay = delay + (i * staggerMs) / 1000;
        const itemStyle: CSSProperties = {
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : `translateY(${distance}px)`,
          transition: `opacity ${durationMs}ms ${EASE} ${itemDelay}s, transform ${durationMs}ms ${EASE} ${itemDelay}s`,
        };
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional stagger order is the identity
          <div key={`stagger-${i}`} style={itemStyle}>
            {child}
          </div>
        );
      })}
    </div>
  );
}
