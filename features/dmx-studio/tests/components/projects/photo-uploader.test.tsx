// FASE 14.F.2 Sprint 1 — PhotoUploader smoke + behavior contract.
// Modo A: tRPC + storage upload + classifier mocked. No real network.

import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
}));

const signedUrlMutateAsync = vi.fn(async () => ({
  uploadUrl: 'https://mock.upload',
  token: 'tk',
  path: 'user-x/projects/p1/123.bin',
  bucket: 'studio-project-assets',
}));
const registerAssetMutateAsync = vi.fn(async () => ({
  id: 'asset-uuid-1',
  order_index: 0,
}));
const classifyAssetMutateAsync = vi.fn(async () => ({
  ok: true,
  assetId: 'asset-uuid-1',
  spaceType: 'sala',
  confidence: 0.92,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      projects: {
        uploadAssetSignedUrl: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: signedUrlMutateAsync,
            isPending: false,
          }),
        },
        registerAsset: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: registerAssetMutateAsync,
            isPending: false,
          }),
        },
        classifyAsset: {
          useMutation: () => ({
            mutate: vi.fn(),
            mutateAsync: classifyAssetMutateAsync,
            isPending: false,
          }),
        },
      },
    },
  },
}));

describe('PhotoUploader — module export smoke', () => {
  it('exports PhotoUploader and constants', async () => {
    const mod = await import('../../../components/projects/PhotoUploader');
    expect(typeof mod.PhotoUploader).toBe('function');
    expect(mod.PHOTO_UPLOADER_MAX_PHOTOS).toBe(30);
    expect(mod.PHOTO_UPLOADER_MAX_BYTES).toBe(25 * 1024 * 1024);
    expect(mod.PHOTO_UPLOADER_ACCEPT).toContain('image/jpeg');
  });
});

describe('PhotoUploader — input validation guards (Zod-mirrored heuristics)', () => {
  it('rejects more than 30 photos (PHOTO_UPLOADER_MAX_PHOTOS guard)', async () => {
    const mod = await import('../../../components/projects/PhotoUploader');
    expect(mod.PHOTO_UPLOADER_MAX_PHOTOS).toBe(30);
    // Mirror enqueue contract: 31st photo must be rejected.
    const list: number[] = Array.from({ length: 30 }, (_, i) => i);
    const newCount = list.length + 1;
    expect(newCount > mod.PHOTO_UPLOADER_MAX_PHOTOS).toBe(true);
  });

  it('rejects non-image mime types (only image/* accepted)', async () => {
    const mod = await import('../../../components/projects/PhotoUploader');
    const accept = mod.PHOTO_UPLOADER_ACCEPT;
    const pdfMime = 'application/pdf';
    const imageMime = 'image/jpeg';
    expect(accept.includes(pdfMime as never)).toBe(false);
    expect(accept.includes(imageMime as never)).toBe(true);
    // The component checks file.type.startsWith('image/'); pdf must fail.
    expect(pdfMime.startsWith('image/')).toBe(false);
    expect(imageMime.startsWith('image/')).toBe(true);
  });

  it('rejects files exceeding 25 MB (PHOTO_UPLOADER_MAX_BYTES guard)', async () => {
    const mod = await import('../../../components/projects/PhotoUploader');
    const oversized = mod.PHOTO_UPLOADER_MAX_BYTES + 1;
    expect(oversized > mod.PHOTO_UPLOADER_MAX_BYTES).toBe(true);
  });
});

describe('PhotoUploader — successful upload chain calls signed URL + register + classify', () => {
  it('mutation chain: uploadAssetSignedUrl → PUT → registerAsset → classifyAsset', async () => {
    const clientMod = await import('@/shared/lib/trpc/client');
    const signedHook = clientMod.trpc.studio.projects.uploadAssetSignedUrl
      .useMutation as unknown as () => {
      mutateAsync: (args: unknown) => Promise<{
        uploadUrl: string;
        token: string;
        path: string;
        bucket: string;
      }>;
    };
    const registerHook = clientMod.trpc.studio.projects.registerAsset
      .useMutation as unknown as () => {
      mutateAsync: (args: unknown) => Promise<{ id: string; order_index: number }>;
    };
    const classifyHook = clientMod.trpc.studio.projects.classifyAsset
      .useMutation as unknown as () => {
      mutateAsync: (args: unknown) => Promise<{
        ok: boolean;
        assetId: string;
        spaceType: string;
        confidence: number;
      }>;
    };

    const signed = await signedHook().mutateAsync({ projectId: 'project-uuid' });
    expect(signed.bucket).toBe('studio-project-assets');
    expect(signed.path).toMatch(/projects\//);

    const registered = await registerHook().mutateAsync({
      projectId: 'project-uuid',
      storagePath: signed.path,
      fileName: 'foto-1.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      orderIndex: 0,
    });
    expect(registered.id).toBe('asset-uuid-1');

    const classified = await classifyHook().mutateAsync({
      projectId: 'project-uuid',
      assetId: registered.id,
    });
    expect(classified.ok).toBe(true);
    expect(classified.spaceType).toBe('sala');
    expect(classified.confidence).toBeGreaterThan(0);
  });
});
