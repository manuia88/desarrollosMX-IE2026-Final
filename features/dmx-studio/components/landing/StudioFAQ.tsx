'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FadeUp, StaggerContainer } from '@/shared/ui/motion';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const;
type FaqKey = (typeof FAQ_KEYS)[number];

function FaqItem({
  itemKey,
  question,
  answer,
  open,
  onToggle,
}: {
  readonly itemKey: FaqKey;
  readonly question: string;
  readonly answer: string;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  const panelId = `studio-faq-panel-${itemKey}`;
  const buttonId = `studio-faq-button-${itemKey}`;
  return (
    <Card variant="elevated" className="overflow-hidden">
      <button
        type="button"
        id={buttonId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-all hover:-translate-y-px"
        style={{
          color: 'var(--canon-cream)',
          fontFamily: 'var(--font-display)',
        }}
      >
        <span className="text-base font-semibold md:text-lg">{question}</span>
        <span
          aria-hidden="true"
          className="flex-shrink-0 text-xl transition-transform"
          style={{
            color: 'var(--canon-indigo-2)',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            transitionDuration: 'var(--canon-duration-fast)',
            transitionTimingFunction: 'var(--canon-ease-out)',
          }}
        >
          +
        </span>
      </button>
      <section
        id={panelId}
        aria-labelledby={buttonId}
        hidden={!open}
        className="px-5 pb-5 text-sm"
        style={{ color: 'var(--canon-cream-2)', lineHeight: 'var(--leading-relaxed)' }}
      >
        {answer}
      </section>
    </Card>
  );
}

export function StudioFAQ() {
  const t = useTranslations('Studio.faq');
  const [openKey, setOpenKey] = useState<FaqKey | null>(FAQ_KEYS[0]);

  return (
    <section
      id="faq"
      aria-label={t('sectionLabel')}
      className="relative px-6 py-20"
      style={{ background: 'var(--canon-bg)' }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <FadeUp>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2
              className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ color: 'var(--canon-cream)' }}
            >
              {t('title')}
            </h2>
            <p className="max-w-2xl text-sm" style={{ color: 'var(--canon-cream-2)' }}>
              {t('subtitle')}
            </p>
            <DisclosurePill tone="indigo">{t('sectionLabel')}</DisclosurePill>
          </div>
        </FadeUp>

        <StaggerContainer className="flex flex-col gap-3">
          {FAQ_KEYS.map((key) => (
            <FaqItem
              key={key}
              itemKey={key}
              question={t(`items.${key}.q`)}
              answer={t(`items.${key}.a`)}
              open={openKey === key}
              onToggle={() => setOpenKey((prev) => (prev === key ? null : key))}
            />
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
