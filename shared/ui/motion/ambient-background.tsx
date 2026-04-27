'use client';

import { type CSSProperties, useEffect, useState } from 'react';

export interface AmbientBackgroundProps {
  intensity?: 'subtle' | 'medium';
  coverage?: 'hero' | 'page';
  className?: string;
  scrollLinked?: boolean;
}

const OPACITY_BY_INTENSITY: Record<NonNullable<AmbientBackgroundProps['intensity']>, number> = {
  subtle: 0.08,
  medium: 0.12,
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

function useScrollY(enabled: boolean): number {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [enabled]);
  return y;
}

export function AmbientBackground({
  intensity = 'subtle',
  coverage = 'hero',
  className = '',
  scrollLinked = true,
}: AmbientBackgroundProps) {
  const reduced = usePrefersReducedMotion();
  const linked = scrollLinked && !reduced;
  const scrollY = useScrollY(linked);
  const offset = linked ? scrollY * 0.05 : 0;

  const opacity = OPACITY_BY_INTENSITY[intensity];

  const containerStyle: CSSProperties =
    coverage === 'page'
      ? {
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: -1,
          overflow: 'hidden',
        }
      : {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: -1,
          overflow: 'hidden',
        };

  const bloomBase: CSSProperties = {
    position: 'absolute',
    borderRadius: '50%',
    transition: reduced ? 'none' : 'transform 80ms linear',
    willChange: reduced ? 'auto' : 'transform',
  };

  if (coverage === 'page') {
    return (
      <div aria-hidden="true" className={className} style={containerStyle}>
        <div
          style={{
            ...bloomBase,
            top: '8vh',
            left: '8%',
            width: '800px',
            height: '800px',
            filter: 'blur(120px)',
            background: `rgba(99, 102, 241, ${opacity})`,
            transform: `translateY(${offset}px)`,
          }}
        />
        <div
          style={{
            ...bloomBase,
            top: '40vh',
            right: '-6%',
            width: '700px',
            height: '700px',
            filter: 'blur(100px)',
            background: `rgba(236, 72, 153, ${opacity * 0.8})`,
            transform: `translateY(${-offset * 0.6}px)`,
          }}
        />
        <div
          style={{
            ...bloomBase,
            top: '78vh',
            left: '24%',
            width: '600px',
            height: '600px',
            filter: 'blur(100px)',
            background: `rgba(168, 85, 247, ${opacity * 0.7})`,
            transform: `translateY(${offset * 0.4}px)`,
          }}
        />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={className} style={containerStyle}>
      <div
        style={{
          ...bloomBase,
          top: '-12%',
          left: '12%',
          width: '40%',
          height: '40%',
          filter: 'blur(80px)',
          background: `rgba(99, 102, 241, ${opacity})`,
          transform: `translateY(${offset}px)`,
        }}
      />
      <div
        style={{
          ...bloomBase,
          top: '20%',
          right: '-8%',
          width: '36%',
          height: '36%',
          filter: 'blur(80px)',
          background: `rgba(236, 72, 153, ${opacity})`,
          transform: `translateY(${-offset * 0.6}px)`,
        }}
      />
      <div
        style={{
          ...bloomBase,
          bottom: '-12%',
          left: '38%',
          width: '32%',
          height: '32%',
          filter: 'blur(80px)',
          background: `rgba(168, 85, 247, ${opacity * 0.85})`,
          transform: `translateY(${offset * 0.4}px)`,
        }}
      />
    </div>
  );
}
