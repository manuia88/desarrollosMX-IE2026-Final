// F14.F.10 Sprint 9 SUB-AGENT 4 — Tests PhotographerPortfolioPage.
// (Sin @testing-library/react: invoca el componente como función y atraviesa
// el árbol de React Element para encontrar nodos.)

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  type PhotographerPortfolioData,
  PhotographerPortfolioPage,
} from '../PhotographerPortfolioPage';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('@/shared/lib/trpc/client', () => ({
  trpc: {
    studio: {
      sprint9Photographer: {
        previewPricing: {
          useQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
        },
      },
    },
  },
}));

interface RenderedNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly key: string | null;
}

function collectStrings(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const c of node) collectStrings(c, out);
    return out;
  }
  if (typeof node === 'object') {
    const n = node as { props?: Record<string, unknown> };
    const children = n.props?.children;
    collectStrings(children, out);
  }
  return out;
}

function findFirstWithProp(
  node: unknown,
  propName: string,
  propValue: string,
): RenderedNode | null {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const c of node) {
      const found = findFirstWithProp(c, propName, propValue);
      if (found) return found;
    }
    return null;
  }
  const n = node as RenderedNode;
  if (n.props?.[propName] === propValue) return n;
  const children = n.props?.children;
  return findFirstWithProp(children, propName, propValue);
}

function buildData(
  overrides: Partial<PhotographerPortfolioData['photographer']> = {},
): PhotographerPortfolioData {
  return {
    photographer: {
      id: '11111111-1111-4111-8111-111111111111',
      userId: '22222222-2222-4222-8222-222222222222',
      businessName: 'Foto Roma Norte',
      slug: 'foto-roma-norte',
      bio: 'Fotografía inmobiliaria profesional.',
      phone: '+52 55 1234 5678',
      email: 'foto@example.com',
      website: 'https://example.com',
      specialityZones: ['Roma Norte', 'Condesa'],
      yearsExperience: 8,
      ratingAvg: 4.5,
      clientsCount: 42,
      videosGeneratedTotal: 120,
      whiteLabelEnabled: false,
      whiteLabelCustomFooter: null,
      markupPct: 25,
      ...overrides,
    },
    videos: [],
  };
}

describe('PhotographerPortfolioPage', () => {
  it('renders hero with business name + bio + speciality zones', () => {
    const data = buildData();
    const result = PhotographerPortfolioPage({
      data,
      slug: 'foto-roma-norte',
      locale: 'es-MX',
    }) as unknown as ReactElement;
    const strings = collectStrings(result);
    expect(strings).toContain('Foto Roma Norte');
    expect(strings).toContain('Fotografía inmobiliaria profesional.');
    expect(strings).toContain('Roma Norte');
    expect(strings).toContain('Condesa');
    const slugNode = findFirstWithProp(result, 'data-photographer-slug', 'foto-roma-norte');
    expect(slugNode).not.toBeNull();
  });

  it('renders 4 stats cards (years/clients/videos/rating)', () => {
    const data = buildData();
    const result = PhotographerPortfolioPage({
      data,
      slug: 'foto-roma-norte',
      locale: 'es-MX',
    }) as unknown as ReactElement;
    const strings = collectStrings(result);
    expect(strings).toContain('8');
    expect(strings).toContain('42');
    expect(strings).toContain('120');
    expect(strings).toContain('4.5');
    expect(strings).toContain('Años de experiencia');
    expect(strings).toContain('Clientes');
    expect(strings).toContain('Videos generados');
    expect(strings).toContain('Rating promedio');
  });

  it('renders white-label custom footer when enabled', () => {
    const data = buildData({
      whiteLabelEnabled: true,
      whiteLabelCustomFooter: '© Foto Roma Norte 2026 · Todos los derechos reservados',
    });
    const result = PhotographerPortfolioPage({
      data,
      slug: 'foto-roma-norte',
      locale: 'es-MX',
    }) as unknown as ReactElement;
    const strings = collectStrings(result);
    expect(strings).toContain('© Foto Roma Norte 2026 · Todos los derechos reservados');
  });
});
