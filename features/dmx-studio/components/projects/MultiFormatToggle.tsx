'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.2 — MultiFormatToggle tabs.
// 3 pestañas (9:16 / 1:1 / 16:9) con badges recomendados por contexto +
// CTA generar formatos adicionales con checkbox beat-sync optional. Calls
// trpc.studio.multiFormat.generateAdditionalFormats.useMutation().

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export type MultiFormatTarget = '9x16' | '1x1' | '16x9';
export type MultiFormatHookVariant = 'hook_a' | 'hook_b' | 'hook_c';

export interface AvailableFormatDescriptor {
  readonly format: MultiFormatTarget;
  readonly storagePath: string;
}

export interface MultiFormatToggleProps {
  readonly projectId: string;
  readonly hookVariant: MultiFormatHookVariant;
  readonly currentFormat: MultiFormatTarget;
  readonly availableFormats: ReadonlyArray<AvailableFormatDescriptor>;
  readonly onSelectFormat: (format: MultiFormatTarget) => void;
}

const FORMATS: ReadonlyArray<MultiFormatTarget> = ['9x16', '1x1', '16x9'];

const SUGGESTION_BY_FORMAT: Record<MultiFormatTarget, string> = {
  '9x16': 'suggestionInstagramStory',
  '1x1': 'suggestionInstagramFeed',
  '16x9': 'suggestionYouTubeLong',
};

const TAB_LABEL_BY_FORMAT: Record<MultiFormatTarget, string> = {
  '9x16': 'tab9x16',
  '1x1': 'tab1x1',
  '16x9': 'tab16x9',
};

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const tabsRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  alignItems: 'center',
};

function tabStyle(active: boolean): CSSProperties {
  return {
    appearance: 'none',
    border: '1px solid',
    borderColor: active ? 'rgba(99,102,241,0.60)' : 'var(--canon-border)',
    background: active ? 'var(--gradient-ai)' : 'var(--surface-recessed)',
    color: active ? '#FFFFFF' : 'var(--canon-cream-2)',
    padding: '8px 16px',
    borderRadius: 'var(--canon-radius-pill)',
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    transition:
      'background var(--canon-duration-fast) ease, border-color var(--canon-duration-fast) ease, color var(--canon-duration-fast) ease',
  };
}

const ctaRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
};

const ctaButtonStyle: CSSProperties = {
  appearance: 'none',
  border: '1px solid rgba(99,102,241,0.30)',
  background: 'transparent',
  color: 'var(--canon-indigo-2)',
  padding: '10px 18px',
  borderRadius: 'var(--canon-radius-pill)',
  fontFamily: 'var(--font-body)',
  fontSize: '13.5px',
  fontWeight: 600,
  cursor: 'pointer',
};

const checkboxLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  color: 'var(--canon-cream-2)',
  cursor: 'pointer',
};

const suggestionTextStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-body)',
  fontSize: '12.5px',
  color: 'var(--canon-cream-2)',
};

export function MultiFormatToggle({
  projectId,
  hookVariant,
  currentFormat,
  availableFormats,
  onSelectFormat,
}: MultiFormatToggleProps) {
  const t = useTranslations('Studio.multiFormat');
  const tablistId = useId();
  const [enableBeatSync, setEnableBeatSync] = useState(false);
  const utils = trpc.useUtils();

  const generateMutation = trpc.studio.multiFormat.generateAdditionalFormats.useMutation({
    onSuccess() {
      void utils.studio.projects.getById.invalidate({ projectId });
    },
  });

  const handleSelect = useCallback(
    (format: MultiFormatTarget) => {
      onSelectFormat(format);
    },
    [onSelectFormat],
  );

  const handleGenerate = useCallback(() => {
    generateMutation.mutate({ projectId, hookVariant, enableBeatSync });
  }, [generateMutation, projectId, hookVariant, enableBeatSync]);

  const availableSet = new Set(availableFormats.map((f) => f.format));
  const incomplete = FORMATS.some((f) => !availableSet.has(f));

  return (
    <div style={containerStyle}>
      <div role="tablist" aria-label={t('tabLabel')} id={tablistId} style={tabsRowStyle}>
        {FORMATS.map((format) => {
          const isActive = format === currentFormat;
          const isAvailable = availableSet.has(format);
          return (
            <button
              key={format}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tablistId}-panel-${format}`}
              data-format={format}
              data-available={isAvailable ? 'true' : 'false'}
              disabled={!isAvailable}
              style={tabStyle(isActive)}
              onClick={() => {
                handleSelect(format);
              }}
            >
              <span>{t(TAB_LABEL_BY_FORMAT[format])}</span>
            </button>
          );
        })}
      </div>

      <div id={`${tablistId}-panel-${currentFormat}`} role="tabpanel" aria-labelledby={tablistId}>
        <p style={suggestionTextStyle}>{t(SUGGESTION_BY_FORMAT[currentFormat])}</p>
      </div>

      {incomplete && (
        <div style={ctaRowStyle} data-testid="multi-format-cta">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            style={ctaButtonStyle}
          >
            {generateMutation.isPending ? t('generatingLabel') : t('generateAdditionalCta')}
          </button>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={enableBeatSync}
              onChange={(e) => {
                setEnableBeatSync(e.currentTarget.checked);
              }}
            />
            <span>{t('beatSyncToggle')}</span>
          </label>
          {generateMutation.isError && (
            <DisclosurePill tone="rose">{t('errorGenerate')}</DisclosurePill>
          )}
        </div>
      )}
    </div>
  );
}
