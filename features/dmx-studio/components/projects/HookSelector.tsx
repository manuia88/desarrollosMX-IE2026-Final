'use client';

// FASE 14.F.2 Sprint 1 — Hook Selector tabs (3 hook variants).
// ARIA tablist pattern. Calls trpc.studio.projects.selectHook on selection.

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback, useId } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export type HookVariant = 'hook_a' | 'hook_b' | 'hook_c';

export interface HookSelectorProps {
  readonly projectId: string;
  readonly currentHook: HookVariant;
  readonly hooks: ReadonlyArray<string>;
  readonly selectedByUser: HookVariant | null;
  readonly onSelect: (hook: HookVariant) => void;
}

const HOOKS: ReadonlyArray<HookVariant> = ['hook_a', 'hook_b', 'hook_c'];

const tabsContainerStyle: CSSProperties = {
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

export function HookSelector({
  projectId,
  currentHook,
  hooks,
  selectedByUser,
  onSelect,
}: HookSelectorProps) {
  const t = useTranslations('Studio.result');
  const tablistId = useId();
  const utils = trpc.useUtils();

  const selectHookMutation = trpc.studio.projects.selectHook.useMutation({
    onSuccess() {
      void utils.studio.projects.getById.invalidate({ projectId });
    },
  });

  const handleSelect = useCallback(
    (hook: HookVariant) => {
      onSelect(hook);
      selectHookMutation.mutate({ projectId, hookVariant: hook });
    },
    [onSelect, projectId, selectHookMutation],
  );

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={t('title')} id={tablistId} style={tabsContainerStyle}>
        {HOOKS.map((hook, idx) => {
          const isActive = hook === currentHook;
          const labelKey = idx === 0 ? 'hookATab' : idx === 1 ? 'hookBTab' : 'hookCTab';
          return (
            <button
              key={hook}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tablistId}-panel-${hook}`}
              data-hook={hook}
              style={tabStyle(isActive)}
              onClick={() => {
                handleSelect(hook);
              }}
            >
              <span>{t(labelKey)}</span>
              {selectedByUser === hook && (
                <span aria-hidden="true" style={{ marginLeft: '8px' }}>
                  <DisclosurePill tone="indigo">{t('selectedBadge')}</DisclosurePill>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p
        id={`${tablistId}-panel-${currentHook}`}
        role="tabpanel"
        aria-labelledby={tablistId}
        style={{
          margin: 0,
          padding: '12px 16px',
          background: 'var(--surface-recessed)',
          border: '1px solid var(--canon-border)',
          borderRadius: 'var(--canon-radius-card)',
          color: 'var(--canon-cream)',
          fontSize: '14px',
          lineHeight: 1.55,
        }}
      >
        {hooks[HOOKS.indexOf(currentHook)] ?? ''}
      </p>
    </div>
  );
}
