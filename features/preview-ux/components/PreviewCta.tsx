'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';
import { trackPreviewCtaClicked } from '../lib/preview-tracking';
import type { PersonaType } from '../types';

export interface PreviewCtaProps {
  readonly persona: PersonaType;
  readonly ctaId: string;
  readonly href: string;
  readonly variant?: 'primary' | 'ghost';
  readonly children: ReactNode;
}

export function PreviewCta({
  persona,
  ctaId,
  href,
  variant = 'primary',
  children,
}: PreviewCtaProps) {
  const locale = useLocale();
  const onClick = () => trackPreviewCtaClicked(persona, ctaId, locale);

  const primary = variant === 'primary';
  return (
    <Link
      href={href}
      onClick={onClick}
      data-cta-id={ctaId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2, 0.5rem)',
        padding: 'var(--space-3, 0.75rem) var(--space-5, 1.25rem)',
        borderRadius: 'var(--radius-md, 0.5rem)',
        background: primary ? 'var(--color-accent-strong)' : 'transparent',
        color: primary ? 'var(--color-accent-on-strong)' : 'var(--color-accent-strong)',
        border: `1px solid ${primary ? 'var(--color-accent-strong)' : 'var(--color-accent-border)'}`,
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-weight-semibold, 600)',
        textDecoration: 'none',
      }}
    >
      {children}
    </Link>
  );
}
