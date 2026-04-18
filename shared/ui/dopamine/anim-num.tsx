'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';

export type AnimNumFormat = 'number' | 'currency' | 'percent';

export interface AnimNumProps {
  value: number;
  format?: AnimNumFormat;
  currency?: string;
  locale?: string;
  duration?: number;
  delay?: number;
  decimals?: number;
  className?: string;
}

export function AnimNum({
  value,
  format = 'number',
  currency = 'MXN',
  locale = 'es-MX',
  duration = 1200,
  delay = 0,
  decimals = 0,
  className,
}: AnimNumProps) {
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();

  const formatter = useMemo(() => {
    const opts: Intl.NumberFormatOptions = {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    };
    if (format === 'currency') {
      opts.style = 'currency';
      opts.currency = currency;
    } else if (format === 'percent') {
      opts.style = 'percent';
    }
    return new Intl.NumberFormat(locale, opts);
  }, [format, currency, locale, decimals]);

  useEffect(() => {
    if (!ref.current) return;
    if (reducedMotion) {
      setCurrent(value);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            setStarted(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [reducedMotion, started, value]);

  useEffect(() => {
    if (!started || reducedMotion) return;
    const startTime = performance.now() + delay;
    let rafId = 0;
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startTime);
      if (elapsed < 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - progress) ** 3;
      setCurrent(value * eased);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [started, value, duration, delay, reducedMotion]);

  const displayValue =
    format === 'percent' ? formatter.format(current / 100) : formatter.format(current);

  return (
    <span ref={ref} className={className}>
      {displayValue}
    </span>
  );
}
