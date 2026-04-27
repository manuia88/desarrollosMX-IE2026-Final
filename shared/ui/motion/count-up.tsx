'use client';

import { type CSSProperties, type ElementType, useEffect, useRef, useState } from 'react';
import { useInView } from './use-in-view';

export interface CountUpProps {
  to: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function formatNumber(value: number, decimals: number): string {
  if (decimals <= 0) return Math.round(value).toString();
  return value.toFixed(decimals);
}

export function CountUp({
  to,
  durationMs = 1800,
  decimals = 0,
  prefix = '',
  suffix = '',
  as: Tag = 'span',
  className = '',
  style,
}: CountUpProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(durationMs, now - start);
      const t = durationMs > 0 ? elapsed / durationMs : 1;
      setValue(easeOutCubic(t) * to);
      if (elapsed < durationMs) raf = requestAnimationFrame(tick);
      else setValue(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, durationMs]);

  const Component = Tag as ElementType;

  return (
    <Component ref={ref} className={className} style={style}>
      {prefix}
      {formatNumber(value, decimals)}
      {suffix}
    </Component>
  );
}
