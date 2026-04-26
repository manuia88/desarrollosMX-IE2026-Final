'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useState } from 'react';

const STAGES = ['source', 'enrich', 'validate', 'push'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_LABEL_KEY: Record<Stage, string> = {
  source: 'stages.source',
  enrich: 'stages.enrich',
  validate: 'stages.validate',
  push: 'stages.push',
};

export function EnrichmentPipelineCard() {
  const t = useTranslations('AsesorContactos.enrichment');
  const [activeStage, setActiveStage] = useState<Stage>('source');

  const cardStyle: CSSProperties = {
    margin: '12px 28px 0',
    padding: 16,
    borderRadius: 'var(--canon-radius-lg)',
    border: '1px solid var(--canon-border)',
    background: 'var(--surface-elevated)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  return (
    <section style={cardStyle} aria-label={t('aria')}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--canon-cream)',
            margin: 0,
          }}
        >
          {t('title')}
        </h3>
        <span
          style={{
            fontSize: 11,
            color: 'var(--canon-cream-3)',
            padding: '2px 8px',
            borderRadius: 'var(--canon-radius-pill)',
            background: 'var(--surface-recessed)',
          }}
        >
          {t('stubBadge')}
        </span>
      </header>
      <p style={{ fontSize: 12, color: 'var(--canon-cream-2)', margin: 0 }}>{t('subtitle')}</p>
      <ol
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))`,
          gap: 6,
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {STAGES.map((stage, idx) => {
          const isActive = stage === activeStage;
          return (
            <li key={stage}>
              <button
                type="button"
                onClick={() => setActiveStage(stage)}
                aria-pressed={isActive}
                style={{
                  width: '100%',
                  padding: '10px 8px',
                  borderRadius: 'var(--canon-radius-md)',
                  border: '1px solid var(--canon-border)',
                  background: isActive ? 'var(--accent-violet-soft)' : 'var(--surface-recessed)',
                  color: 'var(--canon-cream)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 12,
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--canon-cream-3)' }}>{idx + 1}</span>
                <span>{t(STAGE_LABEL_KEY[stage])}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p style={{ fontSize: 12, color: 'var(--canon-cream-2)', margin: 0 }}>
        {t(`copy.${activeStage}`)}
      </p>
    </section>
  );
}
