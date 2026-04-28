// FASE 14.F.11 Sprint 10 BIBLIA Tarea 10.5 — Preventive regression test (P1.3).
// Empty state contract canon: dashboard / library / photographer dashboard
// renderizan un primer-uso CTA cuando no hay datos. Test previene regresión de
// estos empty states críticos para onboarding asesor + photographer.
// Pattern: Modo A — read source files + assert presencia de empty-state markers
// + i18n keys empty consumidas.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

function readSource(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), 'utf8');
}

describe('P1.3 preventive — Library empty state CTA primer-uso', () => {
  const source = readSource('features/dmx-studio/components/library/LibraryEmptyState.tsx');

  it('renders Card with data-testid="library-empty-state"', () => {
    expect(source).toContain('data-testid="library-empty-state"');
  });

  it('exposes data-testid="library-empty-state-cta" for primer-uso CTA', () => {
    expect(source).toContain('data-testid="library-empty-state-cta"');
  });

  // biome-ignore lint/suspicious/noTemplateCurlyInString: describes JSX template syntax in source
  it('uses next/link href={`/${locale}/studio-app/projects/new`} for CTA destination', () => {
    expect(source).toContain('/studio-app/projects/new');
  });

  it('consumes i18n Studio.library.{emptyTitle, emptySubtitle, emptyCta}', () => {
    expect(source).toContain('emptyTitle');
    expect(source).toContain('emptySubtitle');
    expect(source).toContain('emptyCta');
  });
});

describe('P1.3 preventive — Dashboard empty state CTA primer-uso (StudioRecentVideosGrid)', () => {
  const source = readSource('features/dmx-studio/components/dashboard/StudioRecentVideosGrid.tsx');

  it('renders Card with data-testid="studio-empty-state"', () => {
    expect(source).toContain('data-testid="studio-empty-state"');
  });

  it('exposes "studio-empty-state-cta" as testId prop for primer-uso CTA', () => {
    // testId is forwarded from <StudioCreateVideoButton testId="..." /> to data-testid in render.
    expect(source).toContain('studio-empty-state-cta');
  });

  it('consumes i18n Studio.dashboard.{emptyStateTitle, emptyStateCta}', () => {
    expect(source).toContain('emptyStateTitle');
    expect(source).toContain('emptyStateCta');
  });

  it('renders empty branch when videos.length === 0', () => {
    expect(source).toMatch(/videos\.length\s*===\s*0/);
  });
});

describe('P1.3 preventive — PhotographerDashboard empty state primer-video CTA', () => {
  const source = readSource(
    'features/dmx-studio/components/photographer/PhotographerDashboard.tsx',
  );

  it('renders empty branch when recentVideos.length === 0', () => {
    expect(source).toMatch(/recentVideos\.length\s*===\s*0/);
  });

  it('navigates to projects/new on primer-uso CTA click', () => {
    expect(source).toContain('/studio-app/projects/new');
  });
});

describe('P1.3 preventive — Library + Dashboard i18n empty state keys present', () => {
  it('es-MX Studio.library exposes empty {Title, Subtitle, Cta}', async () => {
    const messages = await import('@/messages/es-MX.json');
    const lib = (
      messages.default as unknown as {
        Studio: {
          library: { emptyTitle: string; emptySubtitle: string; emptyCta: string };
        };
      }
    ).Studio.library;
    expect(lib.emptyTitle.length).toBeGreaterThan(0);
    expect(lib.emptySubtitle.length).toBeGreaterThan(0);
    expect(lib.emptyCta.length).toBeGreaterThan(0);
  });

  it('es-MX Studio.dashboard exposes emptyStateTitle + emptyStateCta', async () => {
    const messages = await import('@/messages/es-MX.json');
    const d = (
      messages.default as unknown as {
        Studio: { dashboard: { emptyStateTitle: string; emptyStateCta: string } };
      }
    ).Studio.dashboard;
    expect(d.emptyStateTitle.length).toBeGreaterThan(0);
    expect(d.emptyStateCta.length).toBeGreaterThan(0);
  });
});
