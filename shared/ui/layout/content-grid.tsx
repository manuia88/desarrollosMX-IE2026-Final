import type { HTMLAttributes } from 'react';
import { cn } from '../primitives/cn';

export interface ContentGridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg';
}

const colsMap: Record<NonNullable<ContentGridProps['cols']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  12: 'grid-cols-12',
};

const gapMap: Record<NonNullable<ContentGridProps['gap']>, string> = {
  sm: 'gap-3',
  md: 'gap-5',
  lg: 'gap-8',
};

export function ContentGrid({ cols, gap = 'md', className, ...props }: ContentGridProps) {
  return (
    <div
      className={cn(
        'w-full max-w-[var(--content-max)] mx-auto px-6 py-6',
        cols && `grid ${colsMap[cols]} ${gapMap[gap]}`,
        className,
      )}
      {...props}
    />
  );
}
