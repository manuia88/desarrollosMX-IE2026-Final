'use client';

// FASE 14.F.4 Sprint 3 UPGRADE 3 — 3 tone variations side-by-side selector.
// Cards: Formal / Cercano / Aspiracional. Asesor selects favorita →
// trpc.studio.copyPack.selectVariation. Selected card uses canon "glow"
// variant (breath glow). FadeUp on mount. ADR-050: pill buttons,
// translateY-only hover, no rotateY/scale, motion ≤ 850ms total.

import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useMemo } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { toast } from '@/shared/ui/primitives/toast';

export interface VariationsSelectorProps {
  readonly copyOutputId: string;
}

interface VariationRow {
  readonly id: string;
  readonly tone: string | null;
  readonly content: string | null;
  readonly is_current: boolean | null;
  readonly cost_usd: number | null;
  readonly version_number: number | null;
}

const SUPPORTED_TONES = ['formal', 'cercano', 'aspiracional'] as const;
type SupportedTone = (typeof SUPPORTED_TONES)[number];

const cardContentStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream)',
  fontSize: '13px',
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '13px',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  color: '#FFFFFF',
};

const metaStyle: CSSProperties = {
  fontFamily: 'var(--font-body)',
  color: 'var(--canon-cream-2)',
  fontSize: '11.5px',
  fontVariantNumeric: 'tabular-nums',
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
  padding: '20px',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
};

function isSupportedTone(t: string | null): t is SupportedTone {
  if (!t) return false;
  return (SUPPORTED_TONES as readonly string[]).includes(t);
}

function formatCost(usd: number | null): string {
  if (usd == null) return '$0.00';
  return `$${usd.toFixed(4)}`;
}

const TONE_KEYS = ['s-formal', 's-cercano', 's-aspiracional'] as const;

export function VariationsSelector({ copyOutputId }: VariationsSelectorProps) {
  const t = useTranslations('Studio.copyPack');
  const utils = trpc.useUtils();
  const variationsQuery = trpc.studio.copyPack.getVariations.useQuery({ copyOutputId });
  const selectVariation = trpc.studio.copyPack.selectVariation.useMutation({
    onSuccess: async () => {
      toast.success(t('variationSelectedToast'));
      await utils.studio.copyPack.getVariations.invalidate({ copyOutputId });
      await utils.studio.copyPack.getByProject.invalidate();
    },
    onError: () => {
      toast.error(t('variationSelectErrorToast'));
    },
  });

  const rows = (variationsQuery.data ?? []) as ReadonlyArray<VariationRow>;

  const byTone = useMemo<Record<SupportedTone, VariationRow | null>>(() => {
    const acc: Record<SupportedTone, VariationRow | null> = {
      formal: null,
      cercano: null,
      aspiracional: null,
    };
    // Pick highest version_number per tone
    for (const row of rows) {
      const tone = row.tone;
      if (!isSupportedTone(tone)) continue;
      const existing = acc[tone];
      if (!existing || (row.version_number ?? 0) > (existing.version_number ?? 0)) {
        acc[tone] = row;
      }
    }
    return acc;
  }, [rows]);

  const handleSelect = useCallback(
    (versionId: string) => {
      selectVariation.mutate({ copyOutputId, versionId });
    },
    [copyOutputId, selectVariation],
  );

  if (variationsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="variations-loading">
        {TONE_KEYS.map((key) => (
          <div key={key} aria-hidden="true" style={skeletonStyle} />
        ))}
      </div>
    );
  }

  if (variationsQuery.isError) {
    return (
      <div role="alert" style={errorStyle} data-testid="variations-error">
        {t('variationsErrorLoading')}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div role="status" style={errorStyle} data-testid="variations-empty">
        {t('variationsEmpty')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3" data-testid="variations-selector">
      {SUPPORTED_TONES.map((tone, index) => {
        const row = byTone[tone];
        if (!row) {
          return (
            <div
              key={tone}
              role="status"
              style={errorStyle}
              data-testid={`variation-missing-${tone}`}
            >
              {t('variationsMissingTone')}
            </div>
          );
        }
        const isSelected = row.is_current === true;
        return (
          <FadeUp key={tone} delay={index * 0.08}>
            <Card
              variant={isSelected ? 'glow' : 'elevated'}
              hoverable
              className="flex flex-col gap-3 p-4"
              data-testid={`variation-card-${tone}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span style={labelStyle}>{t(`tone_${tone}` as const)}</span>
                {isSelected ? (
                  <DisclosurePill tone="violet">{t('selectedBadge')}</DisclosurePill>
                ) : null}
              </div>
              <p style={cardContentStyle}>{row.content ?? ''}</p>
              <div className="flex items-center justify-between gap-2 pt-1">
                <span style={metaStyle}>{formatCost(row.cost_usd)}</span>
                <Button
                  type="button"
                  variant={isSelected ? 'glass' : 'primary'}
                  size="sm"
                  onClick={() => handleSelect(row.id)}
                  disabled={isSelected || selectVariation.isPending}
                  aria-label={t('variationSelectAriaLabel')}
                  data-testid={`variation-select-${tone}`}
                >
                  {isSelected ? t('variationSelectedCta') : t('variationSelectCta')}
                </Button>
              </div>
            </Card>
          </FadeUp>
        );
      })}
    </div>
  );
}
