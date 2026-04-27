'use client';

// FASE 14.F.2 Sprint 1 — UPGRADE DIRECTO. Smart narrative order suggestion
// based on STUDIO_DIRECTOR_NARRATIVE_ORDER heuristic
// (fachada → sala → cocina → recamara → bano → terraza → exterior → amenidad → plano).
// Numbered list with manual reorder + "Aplicar orden sugerido" CTA that
// calls trpc.studio.projects.reorderAssets.

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import {
  type SmartOrderItem,
  suggestNarrativeOrder,
} from '@/features/dmx-studio/lib/director/space-classifier';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface SmartOrderSuggestionAsset {
  readonly id: string;
  readonly orderIndex: number;
  readonly fileName: string;
  readonly previewUrl?: string;
  readonly spaceType: string | null;
}

export interface SmartOrderSuggestionProps {
  readonly projectId: string | null;
  readonly assets: readonly SmartOrderSuggestionAsset[];
  readonly onApplied?: (orderedIds: readonly string[]) => void;
  readonly disabled?: boolean;
}

const KNOWN_SPACE_TYPES = new Set([
  'sala',
  'cocina',
  'recamara',
  'bano',
  'fachada',
  'exterior',
  'plano',
  'terraza',
  'amenidad',
  'otro',
]);

export function SmartOrderSuggestion({
  projectId,
  assets,
  onApplied,
  disabled = false,
}: SmartOrderSuggestionProps) {
  const t = useTranslations('Studio.projects.new');
  const [applied, setApplied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reorderMutation = trpc.studio.projects.reorderAssets.useMutation();

  const suggestedOrderIds = useMemo<readonly string[]>(() => {
    const items: SmartOrderItem[] = assets.map((a) => {
      const isKnown = a.spaceType && KNOWN_SPACE_TYPES.has(a.spaceType);
      return {
        assetId: a.id,
        orderIndex: a.orderIndex,
        spaceType: isKnown ? (a.spaceType as SmartOrderItem['spaceType']) : null,
      };
    });
    return suggestNarrativeOrder(items);
  }, [assets]);

  const orderedAssets = useMemo(() => {
    const map = new Map(assets.map((a) => [a.id, a]));
    return suggestedOrderIds
      .map((id) => map.get(id))
      .filter((a): a is SmartOrderSuggestionAsset => Boolean(a));
  }, [assets, suggestedOrderIds]);

  const handleApply = useCallback(async () => {
    if (!projectId || suggestedOrderIds.length === 0) return;
    setErrorMessage(null);
    try {
      await reorderMutation.mutateAsync({
        projectId,
        assetOrder: [...suggestedOrderIds],
      });
      setApplied(true);
      onApplied?.(suggestedOrderIds);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'reorder-failed';
      setErrorMessage(msg);
    }
  }, [projectId, reorderMutation, onApplied, suggestedOrderIds]);

  if (assets.length === 0) {
    return (
      <Card variant="recessed" style={{ padding: '14px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--canon-cream-2)' }}>
          {t('smartOrderEmpty')}
        </p>
      </Card>
    );
  }

  return (
    <section
      aria-label={t('smartOrderTitle')}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3
          className="font-[var(--font-display)] text-base font-bold"
          style={{ color: '#FFFFFF', margin: 0 }}
        >
          {t('smartOrderTitle')}
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--canon-cream-2)' }}>
          {t('smartOrderSubtitle')}
        </p>
      </header>

      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {orderedAssets.map((asset, idx) => (
          <li
            key={asset.id}
            data-testid={`smart-order-item-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--canon-border)',
              borderRadius: 'var(--canon-radius-card)',
            }}
          >
            <span
              style={{
                width: '28px',
                height: '28px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--canon-radius-pill)',
                background: 'var(--gradient-ai)',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {idx + 1}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              <span style={{ fontSize: '13px', color: 'var(--canon-cream)' }}>
                {asset.fileName}
              </span>
              {asset.spaceType && (
                <span style={{ fontSize: '11.5px', color: 'var(--canon-cream-2)' }}>
                  {asset.spaceType}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>

      {errorMessage && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '10px 14px',
            background: 'rgba(244,63,94,0.10)',
            border: '1px solid rgba(244,63,94,0.30)',
            borderRadius: 'var(--canon-radius-pill)',
            fontSize: '13px',
            color: '#FCA5A5',
          }}
        >
          {errorMessage}
        </p>
      )}

      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={handleApply}
        disabled={disabled || reorderMutation.isPending || suggestedOrderIds.length === 0}
        aria-busy={reorderMutation.isPending}
        data-testid="smart-order-apply"
      >
        {applied ? t('smartOrderApplied') : t('smartOrderApplyButton')}
      </Button>
    </section>
  );
}
