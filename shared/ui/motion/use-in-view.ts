'use client';

import { type RefObject, useEffect, useState } from 'react';

export interface UseInViewOptions {
  once?: boolean;
  amount?: number;
  rootMargin?: string;
}

export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  options: UseInViewOptions = {},
): boolean {
  const { once = true, amount = 0.2, rootMargin = '0px' } = options;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold: amount, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once, amount, rootMargin]);

  return inView;
}
