'use client';

import { useTranslations } from 'next-intl';
import { LabelPill, type LabelPillTone } from '@/shared/ui/dopamine/label-pill';
import { cn } from '@/shared/ui/primitives/cn';
import type { Citation, CitationType } from '../types';

export interface CitationsListProps {
  readonly citations: ReadonlyArray<Citation>;
  readonly className?: string;
}

const CITATION_TONE: Record<CitationType, LabelPillTone> = {
  score: 'cool',
  macro: 'fresh',
  geo: 'sunset',
  news: 'primary',
};

function formatValue(value: Citation['value']): string {
  if (value === null) return '—';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  return value;
}

export function CitationsList({ citations, className }: CitationsListProps) {
  const t = useTranslations('Causal');

  if (citations.length === 0) {
    return (
      <p
        className={cn('text-sm text-[color:var(--color-text-secondary)]', className)}
        style={{ padding: 'var(--space-3, 0.75rem)' }}
      >
        {t('sources_empty')}
      </p>
    );
  }

  return (
    <ul
      className={cn('m-0 flex list-none flex-col gap-2 p-0', className)}
      aria-label={t('sources_button')}
    >
      {citations.map((c) => {
        const tone = CITATION_TONE[c.type];
        const typeLabel = t(`citation_type.${c.type}`);
        const valueStr = formatValue(c.value);
        const content = (
          <>
            <LabelPill tone={tone} size="sm">
              {typeLabel}
            </LabelPill>
            <span
              className="flex-1 text-[color:var(--color-text-primary)]"
              style={{ fontSize: 'var(--text-sm)' }}
            >
              <strong>{c.label}</strong>
              <span className="text-[color:var(--color-text-secondary)]" style={{ marginLeft: 8 }}>
                {valueStr}
              </span>
            </span>
            <span
              className="text-[color:var(--color-text-tertiary,var(--color-text-secondary))]"
              style={{ fontSize: 'var(--text-xs, 12px)' }}
            >
              {c.source}
              {c.as_of ? ` · ${c.as_of}` : ''}
            </span>
          </>
        );
        return (
          <li
            key={c.ref_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3, 0.75rem)',
              padding: 'var(--space-2, 0.5rem) var(--space-3, 0.75rem)',
              borderRadius: 'var(--radius-md, 8px)',
              background: 'var(--color-surface-muted, rgba(0,0,0,0.03))',
              border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
            }}
          >
            {c.href ? (
              <a
                href={c.href}
                target="_self"
                rel="noopener"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3, 0.75rem)',
                  width: '100%',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
