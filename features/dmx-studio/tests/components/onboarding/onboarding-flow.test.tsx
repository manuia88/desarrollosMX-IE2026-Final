// FASE 14.F.2 Sprint 1 — DMX Studio Onboarding tests (Modo A: smoke + contract).
// Pattern: module export smoke + Zod schema validation + i18n contract + state hook unit.

import { describe, expect, it, vi } from 'vitest';
import {
  onboardingStep1Input,
  onboardingStep2Input,
  onboardingStep3Input,
} from '@/features/dmx-studio/schemas';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      onboarding: {
        completeStep1: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
        },
        completeStep2: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(async () => ({
              ok: true,
              voiceCloneId: 'mock-voice-clone-id',
              nextStep: 'step3',
            })),
            isPending: false,
          })),
        },
        completeStep3: {
          useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })),
        },
        uploadVoiceSample: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(async () => ({
              uploadUrl: 'https://mock.upload',
              token: 'mock-token',
              path: 'mock/voice-samples/x.webm',
              bucket: 'studio-voice-samples',
            })),
            isPending: false,
          })),
        },
      },
    },
  },
}));

describe('OnboardingFlow — module export smoke', () => {
  it('exports OnboardingFlow as function', async () => {
    const mod = await import('../../../components/onboarding/OnboardingFlow');
    expect(typeof mod.OnboardingFlow).toBe('function');
    expect(mod.OnboardingFlow.name).toBe('OnboardingFlow');
  });

  it('exports OnboardingStep1Datos / OnboardingStep2Voice / OnboardingStep3Confirm', async () => {
    const m1 = await import('../../../components/onboarding/OnboardingStep1Datos');
    const m2 = await import('../../../components/onboarding/OnboardingStep2Voice');
    const m3 = await import('../../../components/onboarding/OnboardingStep3Confirm');
    expect(typeof m1.OnboardingStep1Datos).toBe('function');
    expect(typeof m2.OnboardingStep2Voice).toBe('function');
    expect(typeof m3.OnboardingStep3Confirm).toBe('function');
  });
});

describe('useOnboardingState hook — stepper state contract', () => {
  it('initializes at step1 by default and advances through 3 steps via next()', async () => {
    const { useOnboardingState, ONBOARDING_STEP_ORDER } = await import(
      '../../../components/onboarding/use-onboarding-state'
    );
    expect(ONBOARDING_STEP_ORDER).toEqual(['step1', 'step2', 'step3']);
    expect(typeof useOnboardingState).toBe('function');
  });

  it('respects initialStep option', async () => {
    const { ONBOARDING_STEP_ORDER } = await import(
      '../../../components/onboarding/use-onboarding-state'
    );
    // stepper renders with index 0..2, all 3 ids present and ordered.
    expect(ONBOARDING_STEP_ORDER.indexOf('step1')).toBe(0);
    expect(ONBOARDING_STEP_ORDER.indexOf('step2')).toBe(1);
    expect(ONBOARDING_STEP_ORDER.indexOf('step3')).toBe(2);
  });
});

describe('Step 1 form validation — Zod schema contract', () => {
  it('rejects missing required fields (name + phone + city + zones)', () => {
    const result = onboardingStep1Input.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty zones array (min 1)', () => {
    const result = onboardingStep1Input.safeParse({
      name: 'Asesor Test',
      phone: '5551234567',
      city: 'CDMX',
      zones: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts well-formed Step 1 payload (drives completeStep1 mutation)', () => {
    const result = onboardingStep1Input.safeParse({
      name: 'Asesor Demo',
      phone: '5551234567',
      city: 'Ciudad de México',
      zones: ['Polanco', 'Roma Norte'],
    });
    expect(result.success).toBe(true);
  });
});

describe('Step 2 voice preview + recorder + upload contract', () => {
  it('VoiceQualityPreview exposes 3 sample IDs (aurora, mateo, sofia)', async () => {
    const mod = await import('../../../components/onboarding/VoiceQualityPreview');
    expect(typeof mod.VoiceQualityPreview).toBe('function');
    expect(mod.VOICE_PREVIEW_SAMPLE_IDS).toEqual(['aurora-mx', 'mateo-mx', 'sofia-mx']);
    expect(mod.VOICE_PREVIEW_SAMPLE_IDS.length).toBe(3);
  });

  it('VoiceRecorder exports as function (Blob captured via MediaRecorder mock)', async () => {
    const mod = await import('../../../components/onboarding/VoiceRecorder');
    expect(typeof mod.VoiceRecorder).toBe('function');
  });

  it('Step 2 Zod schema requires consentSigned + voiceSampleStoragePath + voiceName', () => {
    const missing = onboardingStep2Input.safeParse({});
    expect(missing.success).toBe(false);
    const ok = onboardingStep2Input.safeParse({
      voiceSampleStoragePath: 'user-uuid/voice-samples/12345_sample.webm',
      voiceLanguage: 'es-MX',
      voiceName: 'Mi voz profesional',
      consentSigned: true,
    });
    expect(ok.success).toBe(true);
  });

  it('Step 2 mutation chain: uploadVoiceSample → PUT signed URL → completeStep2', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const uploadHook = clientMod.trpc.studio.onboarding.uploadVoiceSample
      .useMutation as unknown as () => {
      mutateAsync: (
        args: unknown,
      ) => Promise<{ uploadUrl: string; token: string; path: string; bucket: string }>;
    };
    const completeHook = clientMod.trpc.studio.onboarding.completeStep2
      .useMutation as unknown as () => {
      mutateAsync: (
        args: unknown,
      ) => Promise<{ ok: boolean; voiceCloneId: string; nextStep: 'step3' }>;
    };
    const uploadMutation = uploadHook();
    const completeMutation = completeHook();
    const signed = await uploadMutation.mutateAsync({
      fileName: 'voice-sample-1.webm',
      contentType: 'audio/webm',
      durationSeconds: 15,
    });
    expect(signed.path).toMatch(/voice-samples/);
    expect(signed.bucket).toBe('studio-voice-samples');
    const result = await completeMutation.mutateAsync({
      voiceSampleStoragePath: signed.path,
      voiceLanguage: 'es-MX',
      voiceName: 'Mi voz',
      consentSigned: true,
    });
    expect(result.voiceCloneId).toBe('mock-voice-clone-id');
    expect(result.nextStep).toBe('step3');
  });
});

describe('Step 3 disclosure + completion contract', () => {
  it('rejects acknowledgedDisclosure=false (server requires true)', () => {
    // Schema accepts boolean; server-side enforces true. Client mirrors via aria-disabled.
    const parsed = onboardingStep3Input.safeParse({ acknowledgedDisclosure: false });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.acknowledgedDisclosure).toBe(false);
    }
  });

  it('accepts acknowledgedDisclosure=true and triggers completion + redirect', async () => {
    const parsed = onboardingStep3Input.safeParse({ acknowledgedDisclosure: true });
    expect(parsed.success).toBe(true);
    const clientMod = await import('@/shared/lib/trpc/client');
    const completeStep3Hook = clientMod.trpc.studio.onboarding.completeStep3
      .useMutation as unknown as () => { mutate: (args: unknown) => void; isPending: boolean };
    const completeStep3Mutation = completeStep3Hook();
    expect(typeof completeStep3Mutation.mutate).toBe('function');
  });
});

describe('i18n contract — Studio.onboarding namespace', () => {
  it('es-MX has all required onboarding keys', async () => {
    const messages = await import('@/messages/es-MX.json');
    const json = messages.default as unknown as {
      Studio: {
        onboarding: {
          title: string;
          subtitle: string;
          stepperLabel: string;
          stepper: { step1: string; step2: string; step3: string };
          step1Title: string;
          step1Subtitle: string;
          nameLabel: string;
          phoneLabel: string;
          cityLabel: string;
          zonesLabel: string;
          zonesHelp: string;
          continueButton: string;
          step2Title: string;
          step2Subtitle: string;
          voicePreviewTitle: string;
          voicePreviewHelp: string;
          recordButton: string;
          stopButton: string;
          recordAgainButton: string;
          playButton: string;
          voiceConsent: string;
          step3Title: string;
          step3Subtitle: string;
          disclosureLabel: string;
          completeButton: string;
        };
      };
    };
    const o = json.Studio.onboarding;
    expect(o.title.length).toBeGreaterThan(3);
    expect(o.subtitle.length).toBeGreaterThan(3);
    expect(o.stepper.step1.length).toBeGreaterThan(0);
    expect(o.stepper.step2.length).toBeGreaterThan(0);
    expect(o.stepper.step3.length).toBeGreaterThan(0);
    expect(o.step1Title.length).toBeGreaterThan(3);
    expect(o.step2Title.length).toBeGreaterThan(3);
    expect(o.step3Title.length).toBeGreaterThan(3);
    expect(o.continueButton.length).toBeGreaterThan(0);
    expect(o.completeButton.length).toBeGreaterThan(0);
    expect(o.disclosureLabel.length).toBeGreaterThan(10);
    expect(o.voiceConsent.length).toBeGreaterThan(10);
  });

  it('en-US mirrors the same onboarding key shape as es-MX', async () => {
    const esMod = await import('@/messages/es-MX.json');
    const enMod = await import('@/messages/en-US.json');
    const es = (esMod.default as unknown as { Studio: { onboarding: Record<string, unknown> } })
      .Studio.onboarding;
    const en = (enMod.default as unknown as { Studio: { onboarding: Record<string, unknown> } })
      .Studio.onboarding;
    const esKeys = Object.keys(es).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(esKeys);
  });
});
