'use client';

// FASE 14.F.2 Sprint 1 — DMX Studio Onboarding orchestrator (Client Component).
// 3 pasos: datos → voice sample → disclosure. ADR-050 canon (pill buttons, brand gradient,
// motion ≤ 850ms, prefers-reduced-motion respect).

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';
import { OnboardingStep1Datos, type OnboardingStep1InitialValues } from './OnboardingStep1Datos';
import { OnboardingStep2Voice } from './OnboardingStep2Voice';
import { OnboardingStep3Confirm } from './OnboardingStep3Confirm';
import {
  ONBOARDING_STEP_ORDER,
  type OnboardingStepKey,
  useOnboardingState,
} from './use-onboarding-state';

export interface OnboardingFlowProps {
  readonly initialStep?: OnboardingStepKey;
  readonly locale: string;
  readonly initialValues?: OnboardingStep1InitialValues;
  readonly skipStep1?: boolean;
}

export function OnboardingFlow({
  initialStep,
  locale,
  initialValues,
  skipStep1,
}: OnboardingFlowProps) {
  const t = useTranslations('Studio.onboarding');
  const router = useRouter();
  const state = useOnboardingState(initialStep ? { initialStep } : {});
  const skipAppliedRef = useRef(false);

  useEffect(() => {
    if (skipAppliedRef.current) return;
    if (!skipStep1) return;
    if (state.currentStep !== 'step1') return;
    skipAppliedRef.current = true;
    state.goToStep('step2');
  }, [skipStep1, state]);

  const handleStep1Done = useCallback(() => {
    state.goToStep('step2');
  }, [state]);

  const handleStep2Done = useCallback(
    (voiceSampleStoragePath: string, voiceCloneId: string) => {
      state.setVoiceSampleStoragePath(voiceSampleStoragePath);
      state.setVoiceCloneId(voiceCloneId);
      state.goToStep('step3');
    },
    [state],
  );

  const handleStep3Done = useCallback(() => {
    router.push(`/${locale}/studio-app`);
  }, [router, locale]);

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1
          className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight md:text-4xl"
          style={{ color: '#FFFFFF' }}
        >
          {t('title')}
        </h1>
        <p className="text-base" style={{ color: 'var(--canon-cream-2)', lineHeight: 1.55 }}>
          {t('subtitle')}
        </p>
      </header>

      <Stepper currentStep={state.currentStep} t={t} />

      {state.currentStep === 'step1' && (
        <OnboardingStep1Datos
          onDone={handleStep1Done}
          {...(initialValues ? { initialValues } : {})}
        />
      )}
      {state.currentStep === 'step2' && <OnboardingStep2Voice onDone={handleStep2Done} />}
      {state.currentStep === 'step3' && (
        <OnboardingStep3Confirm voiceCloneId={state.voiceCloneId} onDone={handleStep3Done} />
      )}
    </>
  );
}

interface StepperProps {
  readonly currentStep: OnboardingStepKey;
  readonly t: (key: string) => string;
}

function Stepper({ currentStep, t }: StepperProps) {
  const currentIdx = ONBOARDING_STEP_ORDER.indexOf(currentStep);
  return (
    <ol
      aria-label={t('stepperLabel')}
      className="flex items-center gap-3"
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {ONBOARDING_STEP_ORDER.map((step, idx) => {
        const isCurrent = step === currentStep;
        const isComplete = idx < currentIdx;
        return (
          <li
            key={step}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex flex-1 items-center gap-3"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center text-[12.5px] font-semibold tabular-nums"
              style={{
                borderRadius: 'var(--canon-radius-pill)',
                background:
                  isComplete || isCurrent ? 'var(--gradient-ai)' : 'var(--surface-recessed)',
                color: isComplete || isCurrent ? '#FFFFFF' : 'var(--canon-cream-2)',
                border: '1px solid var(--canon-border)',
              }}
            >
              {idx + 1}
            </span>
            <span
              className="text-[13px] font-medium"
              style={{
                color: isCurrent ? 'var(--canon-cream)' : 'var(--canon-cream-2)',
              }}
            >
              {t(`stepper.${step}`)}
            </span>
            {idx < ONBOARDING_STEP_ORDER.length - 1 && (
              <span
                aria-hidden="true"
                className="hidden flex-1 sm:block"
                style={{
                  height: '1px',
                  background: isComplete ? 'var(--canon-indigo-2)' : 'var(--canon-border)',
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
