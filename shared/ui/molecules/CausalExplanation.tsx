'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useId, useMemo, useState } from 'react';
import type { CausalExplanation as CausalExplanationData, Citation } from '@/shared/types/scores';
import { Card3D } from '@/shared/ui/dopamine/card-3d';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { CitationsList } from '@/shared/ui/molecules/CitationsList';
import { cn } from '@/shared/ui/primitives/cn';

export interface CausalExplanationProps {
  readonly data: CausalExplanationData | null | undefined;
  readonly isLoading: boolean;
  readonly error?: unknown;
  readonly localeSupported?: boolean;
  readonly scopeLabel?: string;
  readonly scopeId?: string;
  readonly className?: string;
  readonly defaultOpen?: boolean;
}

const REF_REGEX = /\[\[([a-z]+):([^\]]+)\]\]/g;
const BOLD_REGEX = /\*\*([^*]+)\*\*/g;

interface RenderSegment {
  readonly key: string;
  readonly node: ReactNode;
}

function renderBoldText(text: string, keyPrefix: string): ReactNode {
  const out: ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  BOLD_REGEX.lastIndex = 0;
  let i = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
  while ((match = BOLD_REGEX.exec(text)) !== null) {
    if (match.index > lastIdx) {
      out.push(<span key={`${keyPrefix}-t-${i}`}>{text.slice(lastIdx, match.index)}</span>);
    }
    out.push(<strong key={`${keyPrefix}-b-${i}`}>{match[1]}</strong>);
    lastIdx = match.index + match[0].length;
    i++;
  }
  if (lastIdx < text.length) {
    out.push(<span key={`${keyPrefix}-t-end`}>{text.slice(lastIdx)}</span>);
  }
  return out.length > 0 ? out : text;
}

function renderExplanationWithRefs(
  md: string,
  citations: ReadonlyArray<Citation>,
): ReadonlyArray<RenderSegment> {
  const refToIndex = new Map<string, number>();
  citations.forEach((c, i) => {
    refToIndex.set(c.ref_id, i + 1);
  });

  const segments: RenderSegment[] = [];
  let lastIdx = 0;
  let segIdx = 0;
  let match: RegExpExecArray | null;
  REF_REGEX.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop
  while ((match = REF_REGEX.exec(md)) !== null) {
    if (match.index > lastIdx) {
      const chunk = md.slice(lastIdx, match.index);
      segments.push({
        key: `seg-${segIdx}`,
        node: renderBoldText(chunk, `seg-${segIdx}`),
      });
      segIdx++;
    }
    const refId = `${match[1]}:${match[2]}`;
    const idxNum = refToIndex.get(refId);
    if (idxNum !== undefined) {
      segments.push({
        key: `ref-${segIdx}`,
        node: (
          <sup
            style={{
              fontSize: '0.7em',
              color: 'var(--color-accent-primary, currentColor)',
              marginLeft: 1,
              marginRight: 1,
            }}
            title={`Referencia ${idxNum}`}
          >
            [{idxNum}]
          </sup>
        ),
      });
      segIdx++;
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < md.length) {
    const chunk = md.slice(lastIdx);
    segments.push({
      key: `seg-${segIdx}`,
      node: renderBoldText(chunk, `seg-${segIdx}`),
    });
  }
  return segments;
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export function CausalExplanation({
  data,
  isLoading,
  error,
  localeSupported = true,
  scopeLabel,
  scopeId,
  className,
  defaultOpen = false,
}: CausalExplanationProps) {
  const t = useTranslations('Causal');
  const [sourcesOpen, setSourcesOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const sourcesId = useId();

  const segments = useMemo(
    () => (data ? renderExplanationWithRefs(data.explanation_md, data.citations) : []),
    [data],
  );

  const title = t('title', { scopeLabel: scopeLabel ?? scopeId ?? '' });

  const handleCopy = (): void => {
    if (typeof navigator === 'undefined' || !data) return;
    const url = typeof window !== 'undefined' && window.location ? window.location.href : '';
    const text = url ? `${data.explanation_md} ${url}` : data.explanation_md;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const canCopy = typeof navigator !== 'undefined';

  const cardClass = cn(
    'rounded-[var(--radius-lg)] border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-raised)] p-6',
    className,
  );

  if (!localeSupported) {
    return (
      <Card3D className={cardClass} aria-label={title}>
        <header style={{ marginBottom: 'var(--space-3, 0.75rem)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {title}
          </h3>
        </header>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{t('locale_fallback')}</p>
      </Card3D>
    );
  }

  if (isLoading) {
    return (
      <Card3D className={cardClass} aria-busy="true" aria-label={t('loading')}>
        <header style={{ marginBottom: 'var(--space-3, 0.75rem)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {title}
          </h3>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2, 0.5rem)' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 12,
                width: i === 2 ? '60%' : '100%',
                borderRadius: 'var(--radius-sm, 4px)',
                background: 'var(--color-surface-muted, rgba(0,0,0,0.08))',
              }}
            />
          ))}
        </div>
      </Card3D>
    );
  }

  if (error || !data) {
    return (
      <Card3D className={cardClass} role="alert" aria-label={t('error')}>
        <header style={{ marginBottom: 'var(--space-3, 0.75rem)' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--text-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              color: 'var(--color-text-primary)',
            }}
          >
            {title}
          </h3>
        </header>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{t('error')}</p>
      </Card3D>
    );
  }

  const generatedShort = formatGeneratedAt(data.generated_at);
  const badgeText = `${t('generated_by')} · ${data.model} · ${generatedShort}`;

  return (
    <Card3D className={cardClass}>
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-3, 0.75rem)',
          marginBottom: 'var(--space-4, 1rem)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--text-lg, 1.125rem)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-text-primary)',
            flex: 1,
            minWidth: 0,
          }}
        >
          {title}
        </h3>
        <LabelPill tone="cool" size="sm">
          {badgeText}
        </LabelPill>
        {data.cached ? (
          <LabelPill tone="fresh" size="sm">
            {t('cached_badge')}
          </LabelPill>
        ) : null}
      </header>

      <p
        style={{
          margin: 0,
          color: 'var(--color-text-primary)',
          fontSize: 'var(--text-base)',
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
        }}
      >
        {segments.map((s) => (
          <span key={s.key}>{s.node}</span>
        ))}
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3, 0.75rem)',
          marginTop: 'var(--space-4, 1rem)',
        }}
      >
        <button
          type="button"
          onClick={() => setSourcesOpen((o) => !o)}
          aria-expanded={sourcesOpen}
          aria-controls={sourcesId}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
            background: 'var(--color-surface-raised, white)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium, 500)',
            cursor: 'pointer',
          }}
        >
          {sourcesOpen ? t('sources_hide') : t('sources_button')}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!canCopy}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
            background: 'var(--color-surface-raised, white)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium, 500)',
            cursor: canCopy ? 'pointer' : 'not-allowed',
            opacity: canCopy ? 1 : 0.6,
          }}
        >
          {copied ? t('copy_success') : t('copy_button')}
        </button>
      </div>

      <section
        id={sourcesId}
        aria-label={t('sources_button')}
        hidden={!sourcesOpen}
        style={{ marginTop: sourcesOpen ? 'var(--space-4, 1rem)' : 0 }}
      >
        {sourcesOpen ? <CitationsList citations={data.citations} /> : null}
      </section>
    </Card3D>
  );
}
