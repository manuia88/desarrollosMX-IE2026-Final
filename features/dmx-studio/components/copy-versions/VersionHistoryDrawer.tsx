'use client';

// FASE 14.F.4 Sprint 3 — Version history side drawer.
// Lateral panel listing paginated versions, filterable by tone.
// ADR-050 canon: surface-recessed, pill buttons. A11y: role=dialog,
// aria-modal=true, focus-visible.

import { useTranslations } from 'next-intl';
import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { STUDIO_COPY_TONES } from '@/features/dmx-studio/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface VersionHistoryDrawerProps {
  readonly copyOutputId: string;
  readonly onClose: () => void;
  readonly limit?: number;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.55)',
  zIndex: 90,
};

const drawerStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: 'min(420px, 100%)',
  background: 'var(--surface-recessed)',
  borderLeft: '1px solid var(--canon-border)',
  display: 'flex',
  flexDirection: 'column',
  padding: '20px',
  gap: '16px',
  zIndex: 91,
  overflowY: 'auto',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '18px',
  color: '#FFFFFF',
};

const filterLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontFamily: 'var(--font-body)',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--canon-cream-2)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const selectStyle: CSSProperties = {
  appearance: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '36px',
  padding: '0 14px',
  borderRadius: 'var(--canon-radius-pill)',
  border: '1px solid var(--canon-border)',
  background: 'var(--surface-elevated)',
  color: 'var(--canon-cream)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  fontWeight: 500,
  outline: 'none',
  width: '100%',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '12px',
  borderRadius: 'var(--canon-radius-inner)',
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
};

const itemLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '13px',
  color: 'var(--canon-cream)',
};

const itemMetaStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '11.5px',
  color: 'var(--canon-cream-2)',
  fontVariantNumeric: 'tabular-nums',
};

const emptyStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: 'var(--canon-cream-2)',
  padding: '12px',
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-inner)',
  height: '64px',
};

type ToneKey = (typeof STUDIO_COPY_TONES)[number];

function isToneKey(value: string): value is ToneKey {
  return (STUDIO_COPY_TONES as readonly string[]).includes(value);
}

const TONE_TONE: Record<ToneKey, 'violet' | 'indigo' | 'amber' | 'rose'> = {
  formal: 'indigo',
  cercano: 'violet',
  aspiracional: 'amber',
  original: 'rose',
};

interface VersionRowShape {
  readonly id: string;
  readonly version_number: number;
  readonly tone: string;
  readonly is_current: boolean;
  readonly cost_usd: number | null;
  readonly regenerated_at: string;
}

export function VersionHistoryDrawer({
  copyOutputId,
  onClose,
  limit = 20,
}: VersionHistoryDrawerProps) {
  const t = useTranslations('Studio.timeMachine');
  const list = trpc.studio.copyVersions.list.useQuery({ copyOutputId, limit });

  const [toneFilter, setToneFilter] = useState<ToneKey | ''>('');

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFilter = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const raw = event.target.value;
    setToneFilter(raw === '' ? '' : isToneKey(raw) ? raw : '');
  }, []);

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

  const filteredVersions = useMemo<ReadonlyArray<VersionRowShape>>(() => {
    const all = (list.data ?? []) as ReadonlyArray<VersionRowShape>;
    if (toneFilter === '') return all;
    const target: string = toneFilter;
    return all.filter((v) => v.tone === target);
  }, [list.data, toneFilter]);

  return (
    <>
      <button
        type="button"
        aria-label={t('drawerClose')}
        style={overlayStyle}
        onClick={onClose}
        data-testid="version-history-drawer-overlay"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('drawerTitle')}
        style={drawerStyle}
        data-testid="version-history-drawer"
      >
        <header style={headerStyle}>
          <h3 style={titleStyle}>{t('drawerTitle')}</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('drawerClose')}
            data-testid="version-history-drawer-close"
          >
            {t('drawerClose')}
          </Button>
        </header>

        <div>
          <label htmlFor="version-history-tone-filter" style={filterLabelStyle}>
            {t('drawerFilterTone')}
          </label>
          <select
            id="version-history-tone-filter"
            data-testid="version-history-drawer-filter-tone"
            value={toneFilter}
            onChange={handleFilter}
            style={selectStyle}
          >
            <option value="">{t('drawerFilterAll')}</option>
            {STUDIO_COPY_TONES.map((tone) => (
              <option key={tone} value={tone}>
                {toneLabel(tone)}
              </option>
            ))}
          </select>
        </div>

        {list.isPending ? (
          <output aria-busy="true" aria-label={t('loading')} style={skeletonStyle} />
        ) : list.isError ? (
          <p style={emptyStyle}>{t('errorLoading')}</p>
        ) : filteredVersions.length === 0 ? (
          <p style={emptyStyle} data-testid="version-history-drawer-empty">
            {t('drawerEmpty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="version-history-drawer-list">
            {filteredVersions.map((version) => (
              <li key={version.id} style={itemStyle}>
                <span className="flex flex-wrap items-center gap-2">
                  <span style={itemLabelStyle}>
                    {t('versionLabel', { n: version.version_number })}
                  </span>
                  <DisclosurePill
                    tone={isToneKey(version.tone) ? TONE_TONE[version.tone] : 'violet'}
                  >
                    {toneLabel(version.tone)}
                  </DisclosurePill>
                  {version.is_current ? (
                    <DisclosurePill tone="violet">{t('currentBadge')}</DisclosurePill>
                  ) : null}
                </span>
                <span style={itemMetaStyle}>
                  {new Date(version.regenerated_at).toLocaleString()}
                </span>
                <span style={itemMetaStyle}>
                  {t('costLabel')}{' '}
                  {version.cost_usd != null ? `$${version.cost_usd.toFixed(4)}` : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
