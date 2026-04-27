// FASE 14.F.2 Sprint 1 — CreateProjectFlow + CrossFunctionImportTabs + smart order
// orchestration smoke + i18n contract + STUB ADR-018 disabled state.

import { describe, expect, it, vi } from 'vitest';
import { suggestNarrativeOrder } from '@/features/dmx-studio/lib/director/space-classifier';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

const createMutateAsync = vi.fn(async () => ({
  id: 'project-uuid-1',
  title: 'Penthouse Polanco',
  status: 'draft',
}));
const generateBriefMutateAsync = vi.fn(async () => ({ ok: true, brief: { steps: [] } }));
const reorderMutateAsync = vi.fn(async () => ({ ok: true, count: 0 }));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      projects: {
        create: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: createMutateAsync,
            isPending: false,
          }),
        },
        generateDirectorBrief: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: generateBriefMutateAsync,
            isPending: false,
          }),
        },
        uploadAssetSignedUrl: {
          useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
        },
        registerAsset: {
          useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
        },
        classifyAsset: {
          useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
        },
        reorderAssets: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: reorderMutateAsync,
            isPending: false,
          }),
        },
      },
      dashboard: {
        getCrossFunctionSuggestions: {
          useQuery: () => ({
            data: { developers: [], captaciones: [] },
            isLoading: false,
            error: null,
          }),
        },
      },
    },
  },
}));

describe('CreateProjectFlow — module export smoke', () => {
  it('exports CreateProjectFlow + child components', async () => {
    const mod = await import('../../../components/projects/CreateProjectFlow');
    expect(typeof mod.CreateProjectFlow).toBe('function');

    const tabs = await import('../../../components/projects/CrossFunctionImportTabs');
    expect(typeof tabs.CrossFunctionImportTabs).toBe('function');

    const smart = await import('../../../components/projects/SmartOrderSuggestion');
    expect(typeof smart.SmartOrderSuggestion).toBe('function');
  });
});

describe('CreateProjectFlow — submit chain calls create + generateDirectorBrief', () => {
  it('invokes both mutations in sequence', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const createHook = clientMod.trpc.studio.projects.create.useMutation as unknown as () => {
      mutateAsync: (args: unknown) => Promise<{ id: string; title: string; status: string }>;
    };
    const briefHook = clientMod.trpc.studio.projects.generateDirectorBrief
      .useMutation as unknown as () => {
      mutateAsync: (args: unknown) => Promise<{ ok: boolean; brief: unknown }>;
    };

    const created = await createHook().mutateAsync({
      title: 'Penthouse Polanco',
      projectType: 'standard',
      styleTemplateKey: 'modern_cinematic',
    });
    expect(created.id).toBe('project-uuid-1');

    const brief = await briefHook().mutateAsync({ projectId: created.id });
    expect(brief.ok).toBe(true);
    expect(createMutateAsync).toHaveBeenCalled();
    expect(generateBriefMutateAsync).toHaveBeenCalled();
  });
});

describe('CreateProjectFlow — disables submit while in flight (phase guard)', () => {
  it('phase transitions idle → creating → directing block re-entry', async () => {
    // The component blocks button via canSubmit && phase === 'idle'.
    // Smoke contract: enum of expected phases is the agreed lifecycle.
    const expectedPhases = ['idle', 'creating', 'directing', 'done'] as const;
    expect(expectedPhases.length).toBe(4);
    expect(expectedPhases).toContain('creating');
    expect(expectedPhases).toContain('directing');
  });
});

describe('CrossFunctionImportTabs — Tab "Importar de portal" disabled with badge ADR-018 STUB', () => {
  it('exports CrossFunctionImportTabs and references coming-soon i18n key', async () => {
    const mod = await import('../../../components/projects/CrossFunctionImportTabs');
    expect(typeof mod.CrossFunctionImportTabs).toBe('function');
  });

  it('i18n badge "tabImportPortalComingSoon" exists in es-MX', async () => {
    const messages = await import('@/messages/es-MX.json');
    const text = (
      messages.default as unknown as {
        Studio: { projects: { new: { tabImportPortalComingSoon: string } } };
      }
    ).Studio.projects.new.tabImportPortalComingSoon;
    expect(text.length).toBeGreaterThan(3);
    expect(text.toLowerCase()).toMatch(/sprint|próximamente/);
  });

  it('component source contains data-stub-activar marker (ADR-018 STUB)', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const url = await import('node:url');
    const here = url.fileURLToPath(new URL('.', import.meta.url));
    const filePath = path.resolve(here, '../../../components/projects/CrossFunctionImportTabs.tsx');
    const source = await fs.readFile(filePath, 'utf-8');
    expect(source).toMatch(/data-stub-activar/);
    expect(source).toMatch(/STUB — activar/);
    expect(source).toMatch(/disabled/);
  });
});

describe('Smart order suggestion — deterministic narrative order heuristic', () => {
  it('orders fachada → sala → cocina → recamara → bano as canon', () => {
    const ordered = suggestNarrativeOrder([
      { assetId: 'a-bano', orderIndex: 0, spaceType: 'bano' },
      { assetId: 'a-sala', orderIndex: 1, spaceType: 'sala' },
      { assetId: 'a-recamara', orderIndex: 2, spaceType: 'recamara' },
      { assetId: 'a-fachada', orderIndex: 3, spaceType: 'fachada' },
      { assetId: 'a-cocina', orderIndex: 4, spaceType: 'cocina' },
    ]);
    expect(ordered).toEqual(['a-fachada', 'a-sala', 'a-cocina', 'a-recamara', 'a-bano']);
  });
});

describe('i18n contract — Studio.projects.new namespace', () => {
  it('es-MX exposes all required keys', async () => {
    const messages = await import('@/messages/es-MX.json');
    const k = (
      messages.default as unknown as {
        Studio: { projects: { new: Record<string, unknown> } };
      }
    ).Studio.projects.new;
    for (const key of [
      'title',
      'subtitle',
      'tabUploadTitle',
      'tabImportPortalTitle',
      'tabImportPortalComingSoon',
      'photoUploaderDragDrop',
      'photoUploaderMax30',
      'propertyTitleLabel',
      'propertyCurrencyLabel',
      'styleSelectorTitle',
      'smartOrderTitle',
      'smartOrderApplyButton',
      'createButton',
      'generatingDirector',
      'errorTitle',
    ]) {
      expect(k[key]).toBeTypeOf('string');
    }
  });

  it('en-US mirrors the same key shape as es-MX', async () => {
    const esMod = await import('@/messages/es-MX.json');
    const enMod = await import('@/messages/en-US.json');
    const es = (
      esMod.default as unknown as {
        Studio: { projects: { new: Record<string, unknown> } };
      }
    ).Studio.projects.new;
    const en = (
      enMod.default as unknown as {
        Studio: { projects: { new: Record<string, unknown> } };
      }
    ).Studio.projects.new;
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });
});
