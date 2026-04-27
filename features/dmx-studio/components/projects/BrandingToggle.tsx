'use client';

// FASE 14.F.3 Sprint 2 — Branding toggle UI (Tarea 2.3 BIBLIA).
// Switch Pro/Agency: branded ON/OFF. Foto plan: disabled (unbranded by default
// reventa). Llama trpc.studio.multiFormat.applyBrandingToggle.useMutation()
// onChange. Badge DisclosurePill canon (violet=branded, indigo=unbranded).

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useCallback, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { DisclosurePill } from '@/shared/ui/primitives/canon';

export type StudioPlanTier = 'pro' | 'foto' | 'agency';

export interface BrandingToggleProps {
  readonly projectId: string;
  readonly videoOutputId: string;
  readonly branded: boolean;
  readonly plan: StudioPlanTier;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--canon-cream)',
  cursor: 'pointer',
};

function switchTrackStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    position: 'relative',
    width: '40px',
    height: '22px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid',
    borderColor: active ? 'rgba(99,102,241,0.60)' : 'var(--canon-border)',
    background: active ? 'var(--gradient-ai)' : 'var(--surface-recessed)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition:
      'background var(--canon-duration-fast) ease, border-color var(--canon-duration-fast) ease, opacity var(--canon-duration-fast) ease',
    appearance: 'none',
    padding: 0,
    flexShrink: 0,
  };
}

function switchThumbStyle(active: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: '2px',
    left: active ? '20px' : '2px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#FFFFFF',
    transition: 'left var(--canon-duration-fast) ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
  };
}

export function BrandingToggle({ projectId, videoOutputId, branded, plan }: BrandingToggleProps) {
  const t = useTranslations('Studio.multiFormat');
  const switchId = useId();
  const [optimistic, setOptimistic] = useState<boolean>(branded);
  const utils = trpc.useUtils();

  const isFoto = plan === 'foto';
  const disabled = isFoto;

  const applyMutation = trpc.studio.multiFormat.applyBrandingToggle.useMutation({
    onSuccess() {
      void utils.studio.projects.getById.invalidate({ projectId });
    },
    onError() {
      setOptimistic(branded);
    },
  });

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const next = !optimistic;
    setOptimistic(next);
    applyMutation.mutate({ projectId, videoOutputId, branded: next });
  }, [applyMutation, disabled, optimistic, projectId, videoOutputId]);

  const showBranded = isFoto ? false : optimistic;

  return (
    <div style={containerStyle}>
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={showBranded}
        aria-label={t('brandedToggle')}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleToggle}
        style={switchTrackStyle(showBranded, disabled)}
        data-branded={showBranded ? 'true' : 'false'}
        data-plan={plan}
      >
        <span aria-hidden="true" style={switchThumbStyle(showBranded)} />
      </button>
      <label htmlFor={switchId} style={labelStyle}>
        {t('brandedToggle')}
      </label>
      <DisclosurePill tone={showBranded ? 'violet' : 'indigo'}>
        {showBranded ? t('brandedBadge') : t('unbrandedBadge')}
      </DisclosurePill>
    </div>
  );
}
