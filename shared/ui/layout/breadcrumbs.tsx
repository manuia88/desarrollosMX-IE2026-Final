'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export type BreadcrumbItem = {
  label: ReactNode;
  href?: string;
};

export interface BreadcrumbsProps {
  readonly items: ReadonlyArray<BreadcrumbItem>;
  readonly tint?: 'lavender' | 'slate' | 'peach' | 'mint' | 'none';
}

const TINT_BG: Record<NonNullable<BreadcrumbsProps['tint']>, string> = {
  lavender: 'rgba(139,92,246,0.08)',
  slate: 'rgba(148,163,184,0.08)',
  peach: 'rgba(251,146,60,0.08)',
  mint: 'rgba(34,197,94,0.08)',
  none: 'transparent',
};

export function Breadcrumbs({ items, tint = 'none' }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]"
      style={{
        background: TINT_BG[tint],
        color: 'var(--canon-cream-2)',
      }}
    >
      <ol className="flex items-center gap-2">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const key = `${idx}-${typeof item.label === 'string' ? item.label : 'crumb'}`;
          return (
            <li key={key} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:underline"
                  style={{ color: 'var(--canon-cream-3)' }}
                >
                  {item.label}
                </Link>
              ) : (
                <span style={{ color: isLast ? 'var(--canon-cream)' : 'var(--canon-cream-3)' }}>
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden="true" style={{ color: 'var(--canon-cream-4)' }}>
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
