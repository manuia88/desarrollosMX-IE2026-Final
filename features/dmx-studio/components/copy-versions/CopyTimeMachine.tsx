'use client';

// FASE 14.F.4 Sprint 3 — Copy Time Machine.
// Histórico per copy_output: lista versions desc por version_number,
// click abre VersionDiffViewer vs current, button rollback.
// ADR-050 canon: surface-recessed list, breath glow current, pill buttons.

import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { VersionDiffViewer } from './VersionDiffViewer';
import { VersionHistoryDrawer } from './VersionHistoryDrawer';

export interface CopyTimeMachineProps {
  readonly copyOutputId: string;
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '12px',
  marginBottom: '16px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '22px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: 'var(--canon-cream-2)',
  marginTop: '4px',
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '8px',
  padding: '12px 16px',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  appearance: 'none',
  background: 'transparent',
  border: 'none',
  color: 'inherit',
};

const metaTextStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '12px',
  color: 'var(--canon-cream-2)',
  fontVariantNumeric: 'tabular-nums',
};

const versionLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '14px',
  color: 'var(--canon-cream)',
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '64px',
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

type ToneKey = 'formal' | 'cercano' | 'aspiracional' | 'original';

const TONE_TONE: Record<ToneKey, 'violet' | 'indigo' | 'amber' | 'rose'> = {
  formal: 'indigo',
  cercano: 'violet',
  aspiracional: 'amber',
  original: 'rose',
};

interface CopyVersionRowShape {
  readonly id: string;
  readonly version_number: number;
  readonly tone: string;
  readonly is_current: boolean;
  readonly cost_usd: number | null;
  readonly regenerated_at: string;
}

function isToneKey(value: string): value is ToneKey {
  return (
    value === 'formal' || value === 'cercano' || value === 'aspiracional' || value === 'original'
  );
}

function formatCost(cost: number | null | undefined): string {
  if (cost == null) return '—';
  return `$${cost.toFixed(4)}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

export function CopyTimeMachine({ copyOutputId }: CopyTimeMachineProps) {
  const t = useTranslations('Studio.timeMachine');
  const utils = trpc.useUtils();
  const list = trpc.studio.copyVersions.list.useQuery({ copyOutputId, limit: 20 });
  const rollback = trpc.studio.copyVersions.rollback.useMutation({
    onSuccess: async () => {
      await utils.studio.copyVersions.list.invalidate({ copyOutputId });
      await utils.studio.copyPack.getByProject.invalidate();
    },
  });

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const currentVersion = useMemo<CopyVersionRowShape | null>(() => {
    const data = (list.data ?? []) as ReadonlyArray<CopyVersionRowShape>;
    return data.find((v) => v.is_current) ?? null;
  }, [list.data]);

  const versions = useMemo<ReadonlyArray<CopyVersionRowShape>>(
    () => (list.data ?? []) as ReadonlyArray<CopyVersionRowShape>,
    [list.data],
  );

  const toneLabel = useCallback(
    (raw: string): string => {
      if (!isToneKey(raw)) return raw;
      const map: Record<ToneKey, string> = {
        formal: t('toneFormal'),
        cercano: t('toneCercano'),
        aspiracional: t('toneAspiracional'),
        original: t('toneOriginal'),
      };
      return map[raw];
    },
    [t],
  );

  const handleSelect = useCallback((versionId: string) => {
    setSelectedVersionId((prev) => (prev === versionId ? null : versionId));
  }, []);

  const handleRollback = useCallback(
    async (versionId: string) => {
      if (typeof window === 'undefined') return;
      const confirmed = window.confirm(t('rollbackConfirm'));
      if (!confirmed) return;
      await rollback.mutateAsync({ copyOutputId, versionId });
    },
    [copyOutputId, rollback, t],
  );

  const handleOpenDrawer = useCallback(() => setDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);

  if (list.isPending) {
    return (
      <Card variant="recessed" className="p-6" data-testid="copy-time-machine-loading">
        <output aria-busy="true" aria-label={t('loading')} style={skeletonStyle} />
      </Card>
    );
  }

  if (list.isError) {
    return (
      <output style={errorStyle} aria-label={t('errorLoading')}>
        {t('errorLoading')}
      </output>
    );
  }

  if (versions.length === 0) {
    return (
      <Card variant="recessed" className="p-6" data-testid="copy-time-machine-empty">
        <p style={subtitleStyle}>{t('emptyState')}</p>
      </Card>
    );
  }

  return (
    <section
      aria-label={t('title')}
      data-testid="copy-time-machine"
      className="flex flex-col gap-4"
    >
      <header style={headerStyle}>
        <div>
          <h2 style={titleStyle}>{t('title')}</h2>
          <p style={subtitleStyle}>{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOpenDrawer}
          aria-label={t('drawerOpen')}
          data-testid="copy-time-machine-open-drawer"
        >
          {t('drawerOpen')}
        </Button>
      </header>

      <ul style={listStyle} data-testid="copy-time-machine-list">
        {versions.map((version) => {
          const isCurrent = version.is_current;
          const isSelected = selectedVersionId === version.id;
          const tone = isToneKey(version.tone) ? TONE_TONE[version.tone] : 'violet';
          return (
            <li key={version.id} className="flex flex-col gap-2">
              <Card
                variant={isCurrent ? 'glow' : 'recessed'}
                hoverable={!isCurrent}
                data-testid={`copy-time-machine-row-${version.id}`}
                aria-current={isCurrent ? 'true' : undefined}
              >
                <button
                  type="button"
                  style={rowStyle}
                  onClick={() => handleSelect(version.id)}
                  aria-expanded={isSelected}
                  aria-controls={`copy-time-machine-diff-${version.id}`}
                  aria-label={`${t('versionLabel', { n: version.version_number })} · ${toneLabel(version.tone)}`}
                  data-testid={`copy-time-machine-select-${version.id}`}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span style={versionLabelStyle}>
                      {t('versionLabel', { n: version.version_number })}
                    </span>
                    <DisclosurePill tone={tone}>{toneLabel(version.tone)}</DisclosurePill>
                    {isCurrent ? (
                      <DisclosurePill tone="violet" aria-label={t('currentBadge')}>
                        {t('currentBadge')}
                      </DisclosurePill>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-3">
                    <span style={metaTextStyle}>{formatTimestamp(version.regenerated_at)}</span>
                    <span style={metaTextStyle}>
                      {t('costLabel')} {formatCost(version.cost_usd)}
                    </span>
                  </span>
                </button>
              </Card>
              {isSelected && currentVersion && currentVersion.id !== version.id ? (
                <div
                  id={`copy-time-machine-diff-${version.id}`}
                  data-testid={`copy-time-machine-diff-${version.id}`}
                  className="flex flex-col gap-3"
                >
                  <VersionDiffViewer versionIdA={currentVersion.id} versionIdB={version.id} />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleRollback(version.id)}
                      disabled={rollback.isPending}
                      aria-label={t('rollbackCta')}
                      data-testid={`copy-time-machine-rollback-${version.id}`}
                    >
                      {rollback.isPending ? t('rollbackPending') : t('rollbackCta')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {drawerOpen ? (
        <VersionHistoryDrawer copyOutputId={copyOutputId} onClose={handleCloseDrawer} limit={20} />
      ) : null}
    </section>
  );
}
