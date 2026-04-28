'use client';

// F14.F.8 Sprint 7 BIBLIA Upgrade 2 — Avatar variants selector (formal/casual/branded).

import type { CSSProperties } from 'react';
import { Button, Card } from '@/shared/ui/primitives/canon';

export type AvatarVariantStyle = 'formal' | 'casual' | 'branded';

export interface AvatarVariantSelectorProps {
  readonly variants: ReadonlyArray<{
    id: string;
    style: AvatarVariantStyle;
    is_default: boolean;
    preview_image_url?: string | null;
  }>;
  readonly onSetDefault: (variantId: string) => Promise<void> | void;
}

const STYLE_LABELS: Record<AvatarVariantStyle, { title: string; description: string }> = {
  formal: { title: 'Formal', description: 'Para listings premium y operaciones cerradas.' },
  casual: { title: 'Casual', description: 'Para reels diarios y community building.' },
  branded: { title: 'Branded', description: 'Con tus colores + logo overlay automático.' },
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  padding: '20px',
};

const cardInnerStyle: CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '16px',
  color: '#FFFFFF',
};

const descStyle: CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.7)',
  lineHeight: 1.5,
};

export function AvatarVariantSelector({ variants, onSetDefault }: AvatarVariantSelectorProps) {
  return (
    <div style={gridStyle} role="radiogroup" aria-label="Avatar variants">
      {variants.map((v) => (
        <Card key={v.id} variant={v.is_default ? 'spotlight' : 'elevated'}>
          <div style={cardInnerStyle}>
            <div style={titleStyle}>{STYLE_LABELS[v.style].title}</div>
            <div style={descStyle}>{STYLE_LABELS[v.style].description}</div>
            {v.is_default ? (
              <span style={{ ...descStyle, color: 'rgba(99,102,241,0.9)' }}>
                Variante predeterminada
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void onSetDefault(v.id)}
                aria-label={`Usar variante ${STYLE_LABELS[v.style].title}`}
              >
                Usar como predeterminada
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
