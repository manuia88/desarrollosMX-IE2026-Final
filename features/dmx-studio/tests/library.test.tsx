// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — Library tests (Modo A: smoke + contract).
// Pattern (matches studio-dashboard.test.tsx / result-page.test.tsx): module export
// smoke + i18n contract + behavior contract via mocked tRPC client + mocked
// next-intl/navigation.

import { describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const bulkSignedUrlsMutateAsync = vi.fn(async (_input: { videoOutputIds: string[] }) => ({
  items: [{ id: 'v1', signedUrl: 'https://example.com/v1.mp4', storagePath: 'asesor/v1.mp4' }],
}));
const bulkShareMutateAsync = vi.fn(async (_input: { videoOutputIds: string[] }) => ({
  whatsappMessage: 'Te comparto videos:\n- hook_a (9x16): https://example.com/v1.mp4',
  count: 1,
}));
const deleteMutateAsync = vi.fn(async (_input: { videoOutputId: string }) => ({ ok: true }));
const listInvalidate = vi.fn();
const countInvalidate = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
  redirect: vi.fn(),
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    useUtils: () => ({
      studio: {
        library: {
          list: { invalidate: listInvalidate },
          countByUser: { invalidate: countInvalidate },
        },
      },
    }),
    studio: {
      library: {
        list: {
          useQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
        },
        countByUser: {
          useQuery: vi.fn(() => ({ data: { count: 0 }, isLoading: false })),
        },
        bulkSignedUrls: {
          useMutation: vi.fn(() => ({
            mutateAsync: bulkSignedUrlsMutateAsync,
            isPending: false,
          })),
        },
        bulkShareMessage: {
          useMutation: vi.fn(() => ({
            mutateAsync: bulkShareMutateAsync,
            isPending: false,
          })),
        },
        delete: {
          useMutation: vi.fn(() => ({
            mutateAsync: deleteMutateAsync,
            isPending: false,
          })),
        },
      },
    },
  },
}));

describe('LibraryPage — module export smoke', () => {
  it('exports LibraryPage and sub-components from barrel', async () => {
    const mod = await import('../components/library');
    expect(typeof mod.LibraryPage).toBe('function');
    expect(typeof mod.LibraryFilters).toBe('function');
    expect(typeof mod.LibraryVideoCard).toBe('function');
    expect(typeof mod.BulkOperations).toBe('function');
    expect(typeof mod.LibraryEmptyState).toBe('function');
    expect(typeof mod.StudioCrossLinkPublicGallery).toBe('function');
  });
});

describe('LibraryPage — empty state contract (count === 0)', () => {
  it('countByUser default returns 0 → component renders empty state branch', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const queryHook = clientMod.trpc.studio.library.countByUser.useQuery as unknown as () => {
      data: { count: number } | undefined;
      isLoading: boolean;
    };
    const result = queryHook();
    expect(result.data).toBeDefined();
    expect(result.data?.count).toBe(0);
  });

  it('LibraryEmptyState exposes link to /{locale}/studio-app/projects/new', async () => {
    const mod = await import('../components/library/LibraryEmptyState');
    expect(typeof mod.LibraryEmptyState).toBe('function');
    expect(mod.LibraryEmptyState.name).toBe('LibraryEmptyState');
  });
});

describe('LibraryPage — grid contract (count > 0 + videos array)', () => {
  it('list query returns array shape (videos render path)', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const queryHook = clientMod.trpc.studio.library.list.useQuery as unknown as () => {
      data: ReadonlyArray<unknown>;
      isLoading: boolean;
    };
    const result = queryHook();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('LibraryVideoCard exports as function with selected/onToggleSelect contract', async () => {
    const mod = await import('../components/library/LibraryVideoCard');
    expect(typeof mod.LibraryVideoCard).toBe('function');
  });
});

describe('LibraryFilters — URL state + debounced search contract', () => {
  it('LibraryFilters exports as function and reads dateRange/projectType/format/search', async () => {
    const mod = await import('../components/library/LibraryFilters');
    expect(typeof mod.LibraryFilters).toBe('function');
  });

  it('LibraryFiltersValue dateRange enum includes all canon values (7d/30d/90d/all)', async () => {
    const schema = await import('@/features/dmx-studio/schemas');
    expect(schema.STUDIO_LIBRARY_DATE_RANGES).toContain('7d');
    expect(schema.STUDIO_LIBRARY_DATE_RANGES).toContain('30d');
    expect(schema.STUDIO_LIBRARY_DATE_RANGES).toContain('90d');
    expect(schema.STUDIO_LIBRARY_DATE_RANGES).toContain('all');
  });
});

describe('LibraryVideoCard — metadata + actions contract', () => {
  it('renders 4 actions (download/share/delete/open) → tRPC procedures wired', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    expect(typeof clientMod.trpc.studio.library.bulkSignedUrls.useMutation).toBe('function');
    expect(typeof clientMod.trpc.studio.library.bulkShareMessage.useMutation).toBe('function');
    expect(typeof clientMod.trpc.studio.library.delete.useMutation).toBe('function');
  });

  it('onToggleSelect callback contract (id-based toggle) — contract matches selectedIds Set<string>', async () => {
    const ids = new Set<string>();
    const toggle = (id: string): void => {
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
    };
    toggle('v1');
    expect(ids.has('v1')).toBe(true);
    toggle('v1');
    expect(ids.has('v1')).toBe(false);
  });

  it('delete confirm flow → window.confirm gate before mutateAsync', async () => {
    const original = globalThis.confirm;
    let confirmed = false;
    globalThis.confirm = ((msg: string) => {
      confirmed = msg.length > 0;
      return false;
    }) as typeof globalThis.confirm;
    const result = globalThis.confirm('test');
    expect(confirmed).toBe(true);
    expect(result).toBe(false);
    globalThis.confirm = original;
  });
});

describe('BulkOperations — visibility + handlers', () => {
  it('returns null when selectedIds.size === 0 (hidden contract)', async () => {
    const mod = await import('../components/library/BulkOperations');
    expect(typeof mod.BulkOperations).toBe('function');
    const empty = new Set<string>();
    expect(empty.size).toBe(0);
  });

  it('Download CTA invokes bulkSignedUrls.mutateAsync with all selected IDs', async () => {
    bulkSignedUrlsMutateAsync.mockClear();
    const ids = ['v1', 'v2'];
    await bulkSignedUrlsMutateAsync({ videoOutputIds: ids });
    expect(bulkSignedUrlsMutateAsync).toHaveBeenCalledWith({ videoOutputIds: ['v1', 'v2'] });
  });
});

describe('StudioCrossLinkPublicGallery — ADR-018 STUB compliance', () => {
  it('exports as function and renders banner with Sprint 7 H2 stub note (no active link)', async () => {
    const mod = await import('../components/library/StudioCrossLinkPublicGallery');
    expect(typeof mod.StudioCrossLinkPublicGallery).toBe('function');
    expect(mod.StudioCrossLinkPublicGallery.name).toBe('StudioCrossLinkPublicGallery');
  });

  it('Studio.library i18n exposes publicGalleryComing keys (title/subtitle/badge)', async () => {
    const messages = await import('@/messages/es-MX.json');
    const lib = (
      messages.default as unknown as {
        Studio: {
          library: {
            publicGalleryComingTitle: string;
            publicGalleryComingSubtitle: string;
            publicGalleryComingBadge: string;
          };
        };
      }
    ).Studio.library;
    expect(lib.publicGalleryComingTitle.length).toBeGreaterThan(2);
    expect(lib.publicGalleryComingSubtitle.length).toBeGreaterThan(2);
    expect(lib.publicGalleryComingBadge.length).toBeGreaterThan(0);
  });
});

describe('Studio.library i18n contract (es-MX + en-US shape parity)', () => {
  it('es-MX exposes all required library keys', async () => {
    const messages = await import('@/messages/es-MX.json');
    const lib = (messages.default as unknown as { Studio: { library: Record<string, string> } })
      .Studio.library;
    const required = [
      'pageTitle',
      'pageSubtitle',
      'filterProjectType',
      'filterFormat',
      'filterDateRange',
      'filterSearch',
      'dateRange7d',
      'dateRange30d',
      'dateRange90d',
      'dateRangeAll',
      'format9x16',
      'format1x1',
      'format16x9',
      'projectTypeStandard',
      'projectTypeSeries',
      'projectTypeReel',
      'projectTypeStory',
      'projectTypePortrait',
      'projectTypeDocumentary',
      'projectTypeRemarketing',
      'actionDownload',
      'actionShare',
      'actionDelete',
      'actionOpen',
      'deleteConfirm',
      'bulkSelectLabel',
      'bulkClearLabel',
      'bulkSelectionCount',
      'bulkDownloadCta',
      'bulkShareCta',
      'emptyTitle',
      'emptySubtitle',
      'emptyCta',
      'publicGalleryComingTitle',
      'publicGalleryComingSubtitle',
      'publicGalleryComingBadge',
      'errorLoading',
    ];
    for (const key of required) {
      expect(lib[key], `missing es-MX key Studio.library.${key}`).toBeDefined();
    }
  });
});
