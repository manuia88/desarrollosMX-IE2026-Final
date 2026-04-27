'use client';

// FASE 14.F.3 Sprint 2 — Brand Kit page orchestrator (Tarea 2.1 BIBLIA).
// Layout 2 columnas (lg:grid-cols-2): Form (izq) + Live preview (der).
// ADR-050 canon: Card variant="elevated", FadeUp wrappers, motion ≤ 850ms.

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { FadeUp } from '@/shared/ui/motion';
import { Card } from '@/shared/ui/primitives/canon';
import { BrandKitForm, type BrandKitFormPreviewValues } from './BrandKitForm';
import { BrandKitLivePreview } from './BrandKitLivePreview';

export function BrandKitPage() {
  const t = useTranslations('Studio.brandKit');
  const [previewValues, setPreviewValues] = useState<BrandKitFormPreviewValues>({});

  const handleValuesChange = useCallback((values: BrandKitFormPreviewValues) => {
    setPreviewValues(values);
  }, []);

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1
          className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight md:text-4xl"
          style={{ color: '#FFFFFF' }}
        >
          {t('pageTitle')}
        </h1>
        <p
          className="text-base"
          style={{ color: 'var(--canon-cream-2)', lineHeight: 1.55, maxWidth: '720px' }}
        >
          {t('pageSubtitle')}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FadeUp delay={0}>
          <Card variant="elevated" className="p-6 md:p-8">
            <BrandKitForm onValuesChange={handleValuesChange} />
          </Card>
        </FadeUp>

        <FadeUp delay={0.05}>
          <Card variant="elevated" className="flex flex-col gap-4 p-6 md:p-8">
            <header className="flex flex-col gap-1">
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '18px',
                  color: '#FFFFFF',
                  margin: 0,
                }}
              >
                {t('previewSection')}
              </h2>
            </header>
            <div className="flex w-full items-start justify-center pt-2">
              <BrandKitLivePreview values={previewValues} />
            </div>
          </Card>
        </FadeUp>
      </div>
    </>
  );
}
