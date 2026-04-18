'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../primitives/cn';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const MAX_PARTICLES = 60;
const LINK_DISTANCE = 120;
const MOBILE_BREAKPOINT = 768;

export interface ParticleFieldProps {
  className?: string;
  color?: string;
}

export function ParticleField({ className, color = 'oklch(0.67 0.19 285)' }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const check = () => setEnabled(window.innerWidth >= MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [reducedMotion]);

  useEffect(() => {
    if (!enabled || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;
    const particles: Particle[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      particles.length = 0;
      const count = Math.min(MAX_PARTICLES, Math.floor((width * height) / 18000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 1.5 + 0.8,
        });
      }
    };

    let rafId = 0;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        if (!a) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          if (!b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DISTANCE) {
            ctx.strokeStyle = color;
            ctx.globalAlpha = (1 - dist / LINK_DISTANCE) * 0.2;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(tick);
    };

    resize();
    seed();
    tick();
    window.addEventListener('resize', () => {
      resize();
      seed();
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [enabled, color]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      tabIndex={-1}
      className={cn('pointer-events-none absolute inset-0 -z-10', className)}
    />
  );
}
