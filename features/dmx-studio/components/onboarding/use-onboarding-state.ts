'use client';

// FASE 14.F.2 Sprint 1 — Onboarding stepper state.
// Steps: step1 (datos asesor) → step2 (voice sample) → step3 (disclosure + finalizar).

import { useCallback, useState } from 'react';

export type OnboardingStepKey = 'step1' | 'step2' | 'step3';

export const ONBOARDING_STEP_ORDER: ReadonlyArray<OnboardingStepKey> = ['step1', 'step2', 'step3'];

export interface UseOnboardingStateOptions {
  readonly initialStep?: OnboardingStepKey;
}

export interface OnboardingState {
  readonly currentStep: OnboardingStepKey;
  readonly currentIndex: number;
  readonly totalSteps: number;
  readonly voiceSampleStoragePath: string | null;
  readonly voiceCloneId: string | null;
  goToStep(step: OnboardingStepKey): void;
  next(): void;
  back(): void;
  setVoiceSampleStoragePath(path: string | null): void;
  setVoiceCloneId(id: string | null): void;
}

export function useOnboardingState(options: UseOnboardingStateOptions = {}): OnboardingState {
  const initial = options.initialStep ?? 'step1';
  const [currentStep, setCurrentStep] = useState<OnboardingStepKey>(initial);
  const [voiceSampleStoragePath, setVoiceSampleStoragePathState] = useState<string | null>(null);
  const [voiceCloneId, setVoiceCloneIdState] = useState<string | null>(null);

  const goToStep = useCallback((step: OnboardingStepKey) => {
    setCurrentStep(step);
  }, []);

  const next = useCallback(() => {
    setCurrentStep((prev) => {
      const idx = ONBOARDING_STEP_ORDER.indexOf(prev);
      const nextIdx = Math.min(idx + 1, ONBOARDING_STEP_ORDER.length - 1);
      const nextStep = ONBOARDING_STEP_ORDER[nextIdx];
      return nextStep ?? prev;
    });
  }, []);

  const back = useCallback(() => {
    setCurrentStep((prev) => {
      const idx = ONBOARDING_STEP_ORDER.indexOf(prev);
      const prevIdx = Math.max(idx - 1, 0);
      const prevStep = ONBOARDING_STEP_ORDER[prevIdx];
      return prevStep ?? prev;
    });
  }, []);

  const setVoiceSampleStoragePath = useCallback((path: string | null) => {
    setVoiceSampleStoragePathState(path);
  }, []);

  const setVoiceCloneId = useCallback((id: string | null) => {
    setVoiceCloneIdState(id);
  }, []);

  const currentIndex = ONBOARDING_STEP_ORDER.indexOf(currentStep);

  return {
    currentStep,
    currentIndex,
    totalSteps: ONBOARDING_STEP_ORDER.length,
    voiceSampleStoragePath,
    voiceCloneId,
    goToStep,
    next,
    back,
    setVoiceSampleStoragePath,
    setVoiceCloneId,
  };
}
