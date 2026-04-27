'use client';

// FASE 14.F.2 Sprint 1 — Style template selector for new project flow.
// 5 cards canon (modern_cinematic | luxe_editorial | family_friendly |
// investor_pitch | minimal_clean). Single select, default modern_cinematic.
// ADR-050 canon: pill buttons, brand gradient on selected, translateY only.

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import {
  STUDIO_STYLE_TEMPLATE_KEYS,
  type StudioStyleTemplateKey,
} from '@/features/dmx-studio/schemas';
import { Card } from '@/shared/ui/primitives/canon';

export interface StyleTemplateSelectorProps {
  readonly value: StudioStyleTemplateKey;
  readonly onChange: (key: StudioStyleTemplateKey) => void;
}

interface StyleMeta {
  readonly key: StudioStyleTemplateKey;
  readonly i18nKey:
    | 'modernCinematic'
    | 'luxeEditorial'
    | 'familyFriendly'
    | 'investorPitch'
    | 'minimalClean';
  readonly accent: string;
}

const STYLE_META: readonly StyleMeta[] = [
  {
    key: 'modern_cinematic',
    i18nKey: 'modernCinematic',
    accent: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  },
  {
    key: 'luxe_editorial',
    i18nKey: 'luxeEditorial',
    accent: 'linear-gradient(135deg, #C9A35C 0%, #8B6914 100%)',
  },
  {
    key: 'family_friendly',
    i18nKey: 'familyFriendly',
    accent: 'linear-gradient(135deg, #14B8A6 0%, #6366F1 100%)',
  },
  {
    key: 'investor_pitch',
    i18nKey: 'investorPitch',
    accent: 'linear-gradient(135deg, #4F46E5 0%, #1E1B4B 100%)',
  },
  {
    key: 'minimal_clean',
    i18nKey: 'minimalClean',
    accent: 'linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 100%)',
  },
];

export function StyleTemplateSelector({ value, onChange }: StyleTemplateSelectorProps) {
  const t = useTranslations('Studio.projects.new');

  const handleSelect = useCallback(
    (key: StudioStyleTemplateKey) => {
      onChange(key);
    },
    [onChange],
  );

  return (
    <section
      aria-label={t('styleSelectorTitle')}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3
          className="font-[var(--font-display)] text-base font-bold"
          style={{ color: '#FFFFFF', margin: 0 }}
        >
          {t('styleSelectorTitle')}
        </h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--canon-cream-2)' }}>
          {t('styleSelectorSubtitle')}
        </p>
      </header>

      <div
        role="radiogroup"
        aria-label={t('styleSelectorTitle')}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {STYLE_META.map((meta) => {
          const isSelected = meta.key === value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: card-radio canon ADR-050 (visual card with image+description, behavior radio group).
            <button
              key={meta.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid={`style-${meta.key}`}
              onClick={() => handleSelect(meta.key)}
              style={{
                appearance: 'none',
                background: 'transparent',
                padding: 0,
                border: 0,
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <Card
                variant={isSelected ? 'glow' : 'elevated'}
                hoverable
                style={{
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  borderColor: isSelected ? 'transparent' : 'var(--canon-border)',
                  ...(isSelected
                    ? { backgroundImage: 'var(--gradient-ai)', backgroundOrigin: 'border-box' }
                    : {}),
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    height: '72px',
                    borderRadius: 'var(--canon-radius-card)',
                    background: meta.accent,
                    boxShadow: 'var(--shadow-canon-rest)',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '14px',
                      color: isSelected ? '#FFFFFF' : 'var(--canon-cream)',
                    }}
                  >
                    {t(`style.${meta.i18nKey}.name`)}
                  </span>
                  <span
                    style={{ fontSize: '12.5px', color: 'var(--canon-cream-2)', lineHeight: 1.45 }}
                  >
                    {t(`style.${meta.i18nKey}.description`)}
                  </span>
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export const STYLE_TEMPLATE_KEYS_LIST: readonly StudioStyleTemplateKey[] =
  STUDIO_STYLE_TEMPLATE_KEYS;
