'use client';

import type { CSSProperties } from 'react';
import { cn } from '../primitives/cn';

interface Shape {
  size: number;
  top: string;
  left: string;
  gradient: string;
  animation: string;
  delay: number;
  opacity: number;
}

const SHAPES: Shape[] = [
  {
    size: 320,
    top: '5%',
    left: '8%',
    gradient: 'var(--gradient-p)',
    animation: 'float-slow 14s ease-in-out infinite, morph-blob 18s ease-in-out infinite',
    delay: 0,
    opacity: 0.35,
  },
  {
    size: 220,
    top: '60%',
    left: '70%',
    gradient: 'var(--gradient-warm)',
    animation: 'float-med 11s ease-in-out infinite, morph-blob 22s ease-in-out infinite',
    delay: 2,
    opacity: 0.28,
  },
  {
    size: 180,
    top: '40%',
    left: '85%',
    gradient: 'var(--gradient-cool)',
    animation: 'float-fast 9s ease-in-out infinite',
    delay: 1,
    opacity: 0.25,
  },
  {
    size: 260,
    top: '75%',
    left: '15%',
    gradient: 'var(--gradient-fresh)',
    animation: 'float-slow 16s ease-in-out infinite, morph-blob 24s ease-in-out infinite',
    delay: 3.5,
    opacity: 0.22,
  },
  {
    size: 140,
    top: '25%',
    left: '55%',
    gradient: 'var(--gradient-sunset)',
    animation: 'float-med 10s ease-in-out infinite',
    delay: 1.8,
    opacity: 0.3,
  },
];

export interface FloatingShapesProps {
  className?: string;
}

export function FloatingShapes({ className }: FloatingShapesProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden -z-10', className)}
    >
      {SHAPES.map((shape, i) => {
        const style: CSSProperties = {
          width: shape.size,
          height: shape.size,
          top: shape.top,
          left: shape.left,
          background: shape.gradient,
          animation: shape.animation,
          animationDelay: `${shape.delay}s`,
          opacity: shape.opacity,
          borderRadius: '40% 60% 60% 40% / 60% 30% 70% 40%',
          filter: 'blur(40px)',
        };
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: decorative static shapes, stable order
          <div key={i} className="absolute" style={style} />
        );
      })}
    </div>
  );
}
