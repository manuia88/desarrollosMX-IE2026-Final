'use client';

import { type CSSProperties, useEffect, useRef } from 'react';

export interface HeroCanvasProps {
  density?: number;
  className?: string;
}

const COLOR_INDIGO = 'rgba(99, 102, 241, 0.55)';
const COLOR_ROSE = 'rgba(236, 72, 153, 0.55)';

interface Dot {
  baseX: number;
  baseY: number;
  radius: number;
  speed: number;
  phase: number;
  amp: number;
  color: string;
}

function buildDots(width: number, height: number, density: number): Dot[] {
  const out: Dot[] = [];
  for (let i = 0; i < density; i++) {
    out.push({
      baseX: Math.random() * width,
      baseY: Math.random() * height,
      radius: 1.5 + Math.random() * 2.5,
      speed: 0.0004 + Math.random() * 0.0006,
      phase: Math.random() * Math.PI * 2,
      amp: 6 + Math.random() * 10,
      color: i % 2 === 0 ? COLOR_INDIGO : COLOR_ROSE,
    });
  }
  return out;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function HeroCanvas({ density = 14, className = '' }: HeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const safeDensity = Math.max(8, Math.min(24, density));
    const reduced = prefersReducedMotion();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dotsRef.current = buildDots(rect.width, rect.height, safeDensity);
    };

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const t = now - startedAtRef.current;
      for (const d of dotsRef.current) {
        const ox = reduced ? 0 : Math.cos(t * d.speed + d.phase) * d.amp;
        const oy = reduced ? 0 : Math.sin(t * d.speed + d.phase * 0.8) * d.amp;
        ctx.beginPath();
        ctx.fillStyle = d.color;
        ctx.arc(d.baseX + ox, d.baseY + oy, d.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduced) rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    startedAtRef.current = performance.now();
    if (reduced) {
      draw(performance.now());
    } else {
      rafRef.current = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [density]);

  const style: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 0,
  };

  return (
    <div aria-hidden="true" className={className} style={style}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
