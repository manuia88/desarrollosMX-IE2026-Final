'use client';

// FASE 14.F.4 Sprint 3 — Time Machine version diff viewer.
// Side-by-side 2 columns w/ token-level highlighting. Uses simpleLineDiff
// (zero deps) from features/dmx-studio/lib/version-diff. ADR-050 canon:
// surface-recessed columns, indigo for added (data observada), rose for
// removed. A11y: aria-labels comparativos + role=region.

import { useTranslations } from 'next-intl';
import { type CSSProperties, useMemo } from 'react';
import { type DiffSegment, simpleLineDiff } from '@/features/dmx-studio/lib/version-diff';
import { trpc } from '@/shared/lib/trpc/client';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface VersionDiffViewerProps {
  readonly versionIdA: string;
  readonly versionIdB: string;
}

const containerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
};

const columnStyle: CSSProperties = {
  padding: '16px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '13px',
  lineHeight: 1.55,
  color: 'var(--canon-cream)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const columnLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: '8px',
};

const segmentBase: CSSProperties = {
  borderRadius: '4px',
  padding: '0 2px',
};

const segmentStyles: Record<DiffSegment['kind'], CSSProperties> = {
  added: {
    ...segmentBase,
    background: 'rgba(99, 102, 241, 0.22)',
    color: 'var(--canon-indigo-3)',
    boxDecorationBreak: 'clone',
  },
  removed: {
    ...segmentBase,
    background: 'rgba(236, 72, 153, 0.20)',
    color: '#f9a8d4',
    textDecoration: 'line-through',
    boxDecorationBreak: 'clone',
  },
  unchanged: {
    color: 'var(--canon-cream)',
  },
};

const summaryStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '12px',
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '180px',
};

const errorStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  color: 'var(--canon-cream-2)',
  padding: '16px',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
};

export function VersionDiffViewer({ versionIdA, versionIdB }: VersionDiffViewerProps) {
  const t = useTranslations('Studio.timeMachine');
  const query = trpc.studio.copyVersions.compare.useQuery({ versionIdA, versionIdB });

  const diff = useMemo(() => {
    const versions = query.data?.versions;
    if (!versions || versions.length !== 2) return null;
    const byId = new Map(versions.map((v) => [v.id, v]));
    const a = byId.get(versionIdA);
    const b = byId.get(versionIdB);
    if (!a || !b) return null;
    return {
      a,
      b,
      result: simpleLineDiff(a.content ?? '', b.content ?? ''),
    };
  }, [query.data, versionIdA, versionIdB]);

  if (query.isPending) {
    return <output aria-busy="true" aria-label={t('loading')} style={skeletonStyle} />;
  }
  if (query.isError || !diff) {
    return (
      <output style={errorStyle} aria-label={t('errorLoading')}>
        {t('errorLoading')}
      </output>
    );
  }

  return (
    <Card
      variant="recessed"
      role="region"
      aria-label={t('diffTitle')}
      data-testid="version-diff-viewer"
      className="p-4"
    >
      <div style={containerStyle}>
        <Card
          variant="recessed"
          aria-label={t('diffLeftLabel')}
          data-testid="version-diff-column-a"
        >
          <div style={columnStyle}>
            <p style={columnLabelStyle}>
              {t('diffLeftLabel')} · v{diff.a.version_number}
            </p>
            {diff.result.left.map((seg, idx) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: diff segments are positional, no stable id available
                key={`left-${idx}-${seg.kind}`}
                style={segmentStyles[seg.kind]}
                data-diff-kind={seg.kind}
              >
                {seg.value}
              </span>
            ))}
          </div>
        </Card>
        <Card
          variant="recessed"
          aria-label={t('diffRightLabel')}
          data-testid="version-diff-column-b"
        >
          <div style={columnStyle}>
            <p style={columnLabelStyle}>
              {t('diffRightLabel')} · v{diff.b.version_number}
            </p>
            {diff.result.right.map((seg, idx) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: diff segments are positional, no stable id available
                key={`right-${idx}-${seg.kind}`}
                style={segmentStyles[seg.kind]}
                data-diff-kind={seg.kind}
              >
                {seg.value}
              </span>
            ))}
          </div>
        </Card>
      </div>
      <div style={summaryStyle}>
        <DisclosurePill tone="indigo" aria-label={t('diffAddedLabel')}>
          {t('diffAddedLabel')} · {diff.result.addedCount}
        </DisclosurePill>
        <DisclosurePill tone="rose" aria-label={t('diffRemovedLabel')}>
          {t('diffRemovedLabel')} · {diff.result.removedCount}
        </DisclosurePill>
        <DisclosurePill tone="violet" aria-label={t('diffUnchangedLabel')}>
          {t('diffUnchangedLabel')} · {diff.result.unchangedCount}
        </DisclosurePill>
      </div>
    </Card>
  );
}
