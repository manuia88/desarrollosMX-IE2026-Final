'use client';

import { type CSSProperties, type ElementType, type ReactNode, useRef } from 'react';
import { useInView } from './use-in-view';

export interface FadeUpProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  durationMs?: number;
  distance?: number;
  blur?: number;
  style?: CSSProperties;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function FadeUp({
  as: Tag = 'div',
  children,
  className = '',
  delay = 0,
  durationMs = 650,
  distance = 24,
  blur = 4,
  style,
}: FadeUpProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const Component = Tag as ElementType;

  const computedStyle: CSSProperties = {
    opacity: inView ? 1 : 0,
    transform: inView ? 'translateY(0)' : `translateY(${distance}px)`,
    filter: inView ? 'blur(0px)' : `blur(${blur}px)`,
    transition: `opacity ${durationMs}ms ${EASE} ${delay}s, transform ${durationMs}ms ${EASE} ${delay}s, filter ${durationMs}ms ${EASE} ${delay}s`,
    ...style,
  };

  return (
    <Component ref={ref} className={className} style={computedStyle}>
      {children}
    </Component>
  );
}
