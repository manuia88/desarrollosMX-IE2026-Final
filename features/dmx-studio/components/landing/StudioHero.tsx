'use client';

import { useTranslations } from 'next-intl';
import { BlurText, FadeUp } from '@/shared/ui/motion';
import { Button, DisclosurePill } from '@/shared/ui/primitives/canon';

function scrollToId(id: string) {
  const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function StudioHero() {
  const t = useTranslations('Studio.hero');

  return (
    <section
      aria-label={t('title')}
      className="relative overflow-hidden"
      style={{ background: 'var(--canon-bg)' }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-24 text-center md:py-32">
        <FadeUp delay={0}>
          <DisclosurePill tone="violet">{t('eyebrow')}</DisclosurePill>
        </FadeUp>

        <BlurText
          as="h1"
          className="font-[var(--font-display)] text-4xl font-extrabold leading-tight tracking-tight md:text-6xl"
          gradientWords={['agencia', 'marketing', 'inmobiliario', 'real', 'estate', 'marketing']}
          gradientItalic={false}
          style={{ color: 'var(--canon-cream)' }}
        >
          {t('title')}
        </BlurText>

        <FadeUp delay={0.15}>
          <p
            className="mx-auto max-w-2xl text-base md:text-lg"
            style={{ color: 'var(--canon-cream-2)', lineHeight: 'var(--leading-relaxed)' }}
          >
            {t('subtitle')}
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              onClick={() => scrollToId('waitlist')}
              aria-label={t('ctaWaitlist')}
            >
              {t('ctaWaitlist')}
            </Button>
            {/* STUB ADR-018 — landing demo placeholder, activar L-NEW-STUDIO-DEMOS-VIDEO */}
            <Button
              variant="glass"
              size="lg"
              onClick={() => scrollToId('demos-placeholder')}
              aria-label={t('ctaDemos')}
              data-stub="studio-demos"
            >
              {t('ctaDemos')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => scrollToId('pricing')}
              aria-label={t('ctaPricing')}
            >
              {t('ctaPricing')}
            </Button>
          </div>
        </FadeUp>

        <FadeUp delay={0.45}>
          <DisclosurePill tone="amber">{t('disclosureLabel')}</DisclosurePill>
        </FadeUp>

        <span
          id="demos-placeholder"
          role="note"
          aria-label={t('demosPlaceholderLabel')}
          className="sr-only"
        />
      </div>
    </section>
  );
}
