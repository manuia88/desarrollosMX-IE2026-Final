'use client';

// FASE 14.F.2 Sprint 1 — Onboarding Step 3: disclosure + finalizar.
// Voice clone IVC stays STUB (FEATURE_FLAGS.ELEVENLABS_VOICE_CLONE_ENABLED=false default).
// completeStep3 marca onboarding_completed=true y redirige a /studio.

import { useTranslations } from 'next-intl';
import { useCallback, useId, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface OnboardingStep3ConfirmProps {
  readonly voiceCloneId: string | null;
  readonly onDone: () => void;
}

export function OnboardingStep3Confirm({ voiceCloneId, onDone }: OnboardingStep3ConfirmProps) {
  const t = useTranslations('Studio.onboarding');
  const formId = useId();
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const completeStep3 = trpc.studio.onboarding.completeStep3.useMutation({
    onSuccess() {
      setServerError(null);
      onDone();
    },
    onError(err) {
      setServerError(err.message);
    },
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!acknowledged) {
        setServerError(t('errorAcknowledgeRequired'));
        return;
      }
      completeStep3.mutate({ acknowledgedDisclosure: acknowledged });
    },
    [acknowledged, completeStep3, t],
  );

  return (
    <FadeUp delay={0}>
      <Card variant="elevated" className="flex flex-col gap-5 p-8">
        <header className="flex flex-col gap-2">
          <h2 className="font-[var(--font-display)] text-xl font-bold" style={{ color: '#FFFFFF' }}>
            {t('step3Title')}
          </h2>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)' }}>
            {t('step3Subtitle')}
          </p>
        </header>

        {voiceCloneId && (
          <DisclosurePill tone="indigo">{t('voiceCloneCreatedLabel')}</DisclosurePill>
        )}

        <section
          aria-label={t('disclosureSectionLabel')}
          className="flex flex-col gap-3 p-5"
          style={{
            background: 'var(--surface-recessed)',
            border: '1px solid var(--canon-border)',
            borderRadius: 'var(--canon-radius-card)',
          }}
        >
          <DisclosurePill tone="amber">{t('voiceCloneFlagLabel')}</DisclosurePill>
          <p className="text-[13.5px]" style={{ color: 'var(--canon-cream-2)', lineHeight: 1.55 }}>
            {t('voiceClonePending')}
          </p>
        </section>

        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          aria-label={t('step3Title')}
          style={{ display: 'grid', gap: '16px' }}
        >
          <label
            htmlFor={`${formId}-acknowledge`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '13px',
              color: 'var(--canon-cream-2)',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            <input
              id={`${formId}-acknowledge`}
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              required
              aria-required="true"
              style={{ marginTop: '3px' }}
            />
            <span>{t('disclosureLabel')}</span>
          </label>

          {serverError && (
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
              {serverError}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!acknowledged || completeStep3.isPending}
            aria-busy={completeStep3.isPending}
            aria-disabled={!acknowledged}
          >
            {completeStep3.isPending ? `${t('completeButton')}…` : t('completeButton')}
          </Button>
        </form>
      </Card>
    </FadeUp>
  );
}
