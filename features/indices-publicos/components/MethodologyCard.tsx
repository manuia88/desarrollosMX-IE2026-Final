'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { INDEX_REGISTRY, type IndexCode } from '../lib/index-registry-helpers';
import { IndexBadge } from './IndexBadge';

export interface MethodologyCardProps {
  readonly code: IndexCode;
  readonly href?: string;
  readonly className?: string;
}

/**
 * Card Dopamine para preview de la metodología de un índice en la grid
 * `/metodologia`. Sin tilt (ADR-023). El card completo es navegable via `Link`.
 */
export function MethodologyCard({ code, href, className }: MethodologyCardProps) {
  const t = useTranslations('IndicesPublic');
  const locale = useLocale();
  const registry = INDEX_REGISTRY[code];
  const resolvedHref = href ?? `/${locale}/metodologia/${code}`;
  const tagline = t(registry.i18nTaglineKey);
  const name = t(registry.i18nNameKey);
  const cta = t('methodology.detail_title', { code });

  return (
    <Card3D
      className={className}
      style={{
        padding: 'var(--space-5, 1.25rem)',
        borderRadius: 'var(--radius-lg, 16px)',
        background: 'var(--color-surface-elevated, var(--color-surface))',
        boxShadow: 'var(--shadow-soft)',
        border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4, 1rem)',
        minHeight: 180,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3, 0.75rem)' }}>
        <IndexBadge code={code} size="lg" />
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
          }}
        >
          {name}
        </h3>
      </header>

      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          flex: 1,
        }}
      >
        {tagline}
      </p>

      <a
        href={resolvedHref}
        aria-label={cta}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-weight-medium, 500)',
          color: 'var(--color-accent-primary, var(--color-text-primary))',
          textDecoration: 'none',
        }}
      >
        {cta}
        <span aria-hidden="true">→</span>
      </a>
    </Card3D>
  );
}
