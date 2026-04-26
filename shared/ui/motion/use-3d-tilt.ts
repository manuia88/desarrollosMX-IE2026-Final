'use client';

import { type RefObject, useEffect, useState } from 'react';

export interface UseTilt3DOptions {
  strength?: number;
  reset?: boolean;
}

export interface TiltTransform {
  rotateX: number;
  rotateY: number;
}

export function useTilt3D<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseTilt3DOptions = {},
): TiltTransform {
  const { strength = 8, reset = true } = options;
  const [tilt, setTilt] = useState<TiltTransform>({ rotateX: 0, rotateY: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ rotateY: x * strength, rotateX: -y * strength });
    };

    const handleLeave = () => {
      if (reset) setTilt({ rotateX: 0, rotateY: 0 });
    };

    el.addEventListener('mousemove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
    };
  }, [ref, strength, reset]);

  return tilt;
}
