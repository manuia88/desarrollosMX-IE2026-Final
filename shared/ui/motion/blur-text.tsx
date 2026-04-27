'use client';

import { type CSSProperties, type ElementType, type ReactNode, useRef } from 'react';
import { useInView } from './use-in-view';

export interface BlurTextProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  staggerMs?: number;
  gradientWords?: ReadonlyArray<string>;
  gradientAll?: boolean;
  gradientItalic?: boolean;
  gradient?: string;
  style?: CSSProperties;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DURATION_MS = 700;

export function splitWords(input: string): ReadonlyArray<string> {
  return input.split(/\s+/).filter((w) => w.length > 0);
}

export function BlurText({
  as: Tag = 'h2',
  children,
  className = '',
  delay = 0,
  staggerMs = 70,
  gradientWords = [],
  gradientAll = false,
  gradientItalic = true,
  gradient = 'linear-gradient(90deg, #6366F1, #EC4899)',
  style,
}: BlurTextProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const text = typeof children === 'string' ? children : String(children);
  const words = splitWords(text);
  const gradSet = new Set(gradientWords.map((w) => w.toLowerCase()));

  const Component = Tag as ElementType;

  return (
    <Component ref={ref} className={className} style={style}>
      {words.map((word, i) => {
        const cleaned = word.replace(/[.,;:!?]/g, '').toLowerCase();
        const isGrad = gradientAll || gradSet.has(cleaned);
        const transitionDelay = `${delay + (i * staggerMs) / 1000}s`;
        const wordStyle: CSSProperties = {
          display: 'inline-block',
          marginRight: i < words.length - 1 ? '0.28em' : 0,
          whiteSpace: 'pre',
          filter: inView ? 'blur(0px)' : 'blur(10px)',
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(24px)',
          transition: `filter ${DURATION_MS}ms ${EASE} ${transitionDelay}, opacity ${DURATION_MS}ms ${EASE} ${transitionDelay}, transform ${DURATION_MS}ms ${EASE} ${transitionDelay}`,
          ...(isGrad
            ? {
                backgroundImage: gradient,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                ...(gradientItalic ? { fontStyle: 'italic' } : {}),
              }
            : {}),
        };
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: static text split, repeats allowed
          <span key={`w-${i}-${word}`} style={wordStyle}>
            {word}
          </span>
        );
      })}
    </Component>
  );
}
