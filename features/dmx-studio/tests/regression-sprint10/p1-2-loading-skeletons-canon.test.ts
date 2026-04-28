// FASE 14.F.11 Sprint 10 BIBLIA Tarea 10.5 — Regression test bug fix P1.2.
// Bug: 3 components series + public-series renderizaban literal "Cargando..."
// inconsistente con canon skeleton del resto del módulo Studio.
// Fix: SeriesListPage / SeriesDetailPage / PublicSeriesPage ahora rinden skeleton
// blocks (var(--surface-recessed) + var(--canon-border) + var(--canon-radius-card))
// con aria-busy + aria-label + data-testid loading.
// Pattern: Modo A — read source files + assert no "Cargando..." string in render
// path + presence of canon skeleton tokens + presence of aria-busy.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

function readSource(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), 'utf8');
}

describe('P1.2 — SeriesListPage loading skeleton canon (no Cargando literal)', () => {
  const path = 'features/dmx-studio/components/series/SeriesListPage.tsx';
  const source = readSource(path);

  it('does not render hardcoded "Cargando..." string in JSX', () => {
    // Permitido en aria-label/comentario; prohibido como visible JSX child.
    const hasJsxLiteral = />\s*Cargando\.\.\.\s*</.test(source);
    expect(hasJsxLiteral).toBe(false);
  });

  it('renders canon skeleton with var(--surface-recessed) + var(--canon-border)', () => {
    expect(source).toContain('var(--surface-recessed)');
    expect(source).toContain('var(--canon-border)');
    expect(source).toContain('var(--canon-radius-card)');
  });

  it('uses aria-busy + data-testid="series-list-loading"', () => {
    expect(source).toContain('aria-busy="true"');
    expect(source).toContain('data-testid="series-list-loading"');
  });
});

describe('P1.2 — SeriesDetailPage loading skeleton canon (no Cargando literal)', () => {
  const path = 'features/dmx-studio/components/series/SeriesDetailPage.tsx';
  const source = readSource(path);

  it('does not render hardcoded "Cargando..." string in JSX', () => {
    const hasJsxLiteral = />\s*Cargando\.\.\.\s*</.test(source);
    expect(hasJsxLiteral).toBe(false);
  });

  it('renders canon skeleton with var(--surface-recessed) + var(--canon-border)', () => {
    expect(source).toContain('var(--surface-recessed)');
    expect(source).toContain('var(--canon-border)');
    expect(source).toContain('var(--canon-radius-card)');
  });

  it('uses aria-busy + data-testid="series-detail-loading"', () => {
    expect(source).toContain('aria-busy="true"');
    expect(source).toContain('data-testid="series-detail-loading"');
  });
});

describe('P1.2 — PublicSeriesPage loading skeleton canon (no Cargando literal)', () => {
  const path = 'features/dmx-studio/components/public-series/PublicSeriesPage.tsx';
  const source = readSource(path);

  it('does not render hardcoded "Cargando..." string in JSX', () => {
    const hasJsxLiteral = />\s*Cargando\.\.\.\s*</.test(source);
    expect(hasJsxLiteral).toBe(false);
  });

  it('renders canon skeleton with var(--surface-recessed) + var(--canon-border)', () => {
    expect(source).toContain('var(--surface-recessed)');
    expect(source).toContain('var(--canon-border)');
    expect(source).toContain('var(--canon-radius-card)');
  });

  it('uses aria-busy + data-testid="public-series-loading"', () => {
    expect(source).toContain('aria-busy="true"');
    expect(source).toContain('data-testid="public-series-loading"');
  });
});

describe('P1.2 — Series components module exports preserved (no regression on contract)', () => {
  it('SeriesListPage still exports SeriesListPage as function', async () => {
    const mod = await import('../../components/series/SeriesListPage');
    expect(typeof mod.SeriesListPage).toBe('function');
    expect(mod.SeriesListPage.name).toBe('SeriesListPage');
  });

  it('SeriesDetailPage still exports SeriesDetailPage as function', async () => {
    const mod = await import('../../components/series/SeriesDetailPage');
    expect(typeof mod.SeriesDetailPage).toBe('function');
    expect(mod.SeriesDetailPage.name).toBe('SeriesDetailPage');
  });

  it('PublicSeriesPage still exports PublicSeriesPage as function', async () => {
    const mod = await import('../../components/public-series/PublicSeriesPage');
    expect(typeof mod.PublicSeriesPage).toBe('function');
    expect(mod.PublicSeriesPage.name).toBe('PublicSeriesPage');
  });
});

describe('P1.2 — i18n contract for Studio.loadingSkeleton', () => {
  it('es-MX exposes loadingSkeleton.ariaLabel', async () => {
    const messages = await import('@/messages/es-MX.json');
    const ls = (
      messages.default as unknown as {
        Studio: { loadingSkeleton: { ariaLabel: string } };
      }
    ).Studio.loadingSkeleton;
    expect(typeof ls.ariaLabel).toBe('string');
    expect(ls.ariaLabel.length).toBeGreaterThan(0);
  });

  it('en-US mirrors the same loadingSkeleton key shape', async () => {
    const esMod = await import('@/messages/es-MX.json');
    const enMod = await import('@/messages/en-US.json');
    const es = Object.keys(
      (esMod.default as unknown as { Studio: { loadingSkeleton: Record<string, unknown> } }).Studio
        .loadingSkeleton,
    ).sort();
    const en = Object.keys(
      (enMod.default as unknown as { Studio: { loadingSkeleton: Record<string, unknown> } }).Studio
        .loadingSkeleton,
    ).sort();
    expect(en).toEqual(es);
  });
});
