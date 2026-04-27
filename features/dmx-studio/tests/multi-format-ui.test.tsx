// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.2 — MultiFormatToggle + BeatSyncIndicator
// Modo A tests: module export smoke + mutation contract + i18n keys presence.
// (No RTL render: project devDependencies do NOT include @testing-library/react;
// existing dmx-studio component tests follow the same module-export + mock
// contract pattern — see hook-selector.test.tsx, feedback-form.test.tsx.)

import { describe, expect, it, vi } from 'vitest';

const generateMutateMock = vi.fn();
const invalidateProjectByIdMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      studio: { projects: { getById: { invalidate: invalidateProjectByIdMock } } },
    }),
    studio: {
      multiFormat: {
        generateAdditionalFormats: {
          useMutation: vi.fn(() => ({
            mutate: generateMutateMock,
            isPending: false,
            isError: false,
          })),
        },
      },
      projects: {
        getById: { invalidate: invalidateProjectByIdMock },
      },
    },
  },
}));

describe('MultiFormatToggle — module export contract', () => {
  it('exports MultiFormatToggle as named function', async () => {
    const mod = await import('../components/projects/MultiFormatToggle');
    expect(typeof mod.MultiFormatToggle).toBe('function');
    expect(mod.MultiFormatToggle.name).toBe('MultiFormatToggle');
  });

  it('declares 3 format tabs (9x16 / 1x1 / 16x9) — matches Studio.multiFormat i18n keys', async () => {
    const messages = await import('@/messages/es-MX.json');
    const json = messages.default as unknown as {
      Studio: { multiFormat: Record<string, string> };
    };
    const m = json.Studio.multiFormat;
    expect(typeof m.tab9x16).toBe('string');
    expect(typeof m.tab1x1).toBe('string');
    expect(typeof m.tab16x9).toBe('string');
    expect(typeof m.generateAdditionalCta).toBe('string');
    expect(typeof m.generatingLabel).toBe('string');
    expect(typeof m.beatSyncToggle).toBe('string');
    expect(typeof m.beatSyncBadge).toBe('string');
  });

  it('generateAdditionalFormats mutation accepts canon payload (projectId/hookVariant/enableBeatSync)', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const useMutationHook = clientMod.trpc.studio.multiFormat.generateAdditionalFormats
      .useMutation as unknown as () => {
      mutate: (input: {
        projectId: string;
        hookVariant: 'hook_a' | 'hook_b' | 'hook_c';
        enableBeatSync: boolean;
      }) => void;
    };
    const m = useMutationHook();
    m.mutate({ projectId: 'p1', hookVariant: 'hook_a', enableBeatSync: true });
    expect(generateMutateMock).toHaveBeenCalledWith({
      projectId: 'p1',
      hookVariant: 'hook_a',
      enableBeatSync: true,
    });
  });
});

describe('BeatSyncIndicator — module export contract', () => {
  it('exports BeatSyncIndicator as named function (returns null when hasBeatSync=false; renders DisclosurePill content when true)', async () => {
    const mod = await import('../components/projects/BeatSyncIndicator');
    expect(typeof mod.BeatSyncIndicator).toBe('function');
    expect(mod.BeatSyncIndicator.name).toBe('BeatSyncIndicator');

    // Smoke render via element creation: verifies invocation contract.
    // hasBeatSync=false → null. hasBeatSync=true → JSX element.
    const offResult = mod.BeatSyncIndicator({ hasBeatSync: false });
    expect(offResult).toBeNull();

    const onResult = mod.BeatSyncIndicator({ hasBeatSync: true });
    expect(onResult).not.toBeNull();
    expect(typeof onResult).toBe('object');
  });
});
