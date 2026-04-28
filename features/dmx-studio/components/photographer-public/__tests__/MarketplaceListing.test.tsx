// F14.F.10 Sprint 9 SUB-AGENT 4 — Tests MarketplaceListing (presentation pure + filter helper).

import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  applyMarketplaceFilters,
  type MarketplaceFilters,
  MarketplaceListingPresentation,
  type MarketplacePhotographer,
} from '../MarketplaceListing';

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: unknown; href: string }) => ({
    type: 'a',
    props: { href, children },
    key: null,
  }),
}));

interface RenderedNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly key: string | null;
}

function collectByTestId(node: unknown, testId: string, out: RenderedNode[] = []): RenderedNode[] {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const c of node) collectByTestId(c, testId, out);
    return out;
  }
  const n = node as RenderedNode;
  if (n.props?.['data-testid'] === testId) out.push(n);
  collectByTestId(n.props?.children, testId, out);
  return out;
}

function findByDataAttr(node: unknown, attr: string, value: string): RenderedNode | null {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const c of node) {
      const f = findByDataAttr(c, attr, value);
      if (f) return f;
    }
    return null;
  }
  const n = node as RenderedNode;
  if (n.props?.[attr] === value) return n;
  return findByDataAttr(n.props?.children, attr, value);
}

function buildPhotographer(
  overrides: Partial<MarketplacePhotographer> = {},
): MarketplacePhotographer {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    photographerId: '22222222-2222-4222-8222-222222222222',
    businessName: 'Foto Roma',
    slug: 'foto-roma',
    bio: 'Bio fotógrafo.',
    ratingAvg: 4.5,
    specialityZones: ['Roma Norte'],
    clientsCount: 10,
    tags: ['interiores'],
    listingPriority: 100,
    ...overrides,
  };
}

const defaultFilters: MarketplaceFilters = {
  zone: '',
  speciality: '',
  minRating: 0,
  limit: 20,
};

describe('MarketplaceListing — render', () => {
  it('renders one card per verified photographer', () => {
    const photographers = [
      buildPhotographer({ id: 'a', slug: 'foto-roma', businessName: 'Foto Roma' }),
      buildPhotographer({
        id: 'b',
        slug: 'foto-condesa',
        businessName: 'Foto Condesa',
        specialityZones: ['Condesa'],
        tags: ['exteriores'],
      }),
    ];
    const result = MarketplaceListingPresentation({
      photographers,
      locale: 'es-MX',
      filters: defaultFilters,
      allZones: ['Roma Norte', 'Condesa'],
      allSpecialities: ['interiores', 'exteriores'],
      onFiltersChange: () => undefined,
    }) as unknown as ReactElement;
    const cards = collectByTestId(result, 'marketplace-card');
    expect(cards.length).toBe(2);
  });

  it('renders empty state when no matching photographers', () => {
    const result = MarketplaceListingPresentation({
      photographers: [],
      locale: 'es-MX',
      filters: defaultFilters,
      allZones: [],
      allSpecialities: [],
      onFiltersChange: () => undefined,
    }) as unknown as ReactElement;
    const empty = findByDataAttr(result, 'data-empty-state', 'true');
    expect(empty).not.toBeNull();
  });
});

describe('applyMarketplaceFilters — pure helper', () => {
  it('filters by zone, speciality, minRating + applies limit', () => {
    const photographers: ReadonlyArray<MarketplacePhotographer> = [
      buildPhotographer({
        id: 'a',
        ratingAvg: 4.5,
        specialityZones: ['Roma Norte'],
        tags: ['interiores'],
      }),
      buildPhotographer({
        id: 'b',
        ratingAvg: 3.0,
        specialityZones: ['Condesa'],
        tags: ['exteriores'],
      }),
      buildPhotographer({
        id: 'c',
        ratingAvg: 4.8,
        specialityZones: ['Roma Norte'],
        tags: ['exteriores'],
      }),
    ];

    // Zone filter Roma Norte → ids a, c
    const byZone = applyMarketplaceFilters(photographers, {
      ...defaultFilters,
      zone: 'Roma Norte',
    });
    expect(byZone.map((p) => p.id)).toEqual(['a', 'c']);

    // Speciality filter exteriores → ids b, c
    const bySpec = applyMarketplaceFilters(photographers, {
      ...defaultFilters,
      speciality: 'exteriores',
    });
    expect(bySpec.map((p) => p.id)).toEqual(['b', 'c']);

    // minRating 4.0 → ids a, c
    const byRating = applyMarketplaceFilters(photographers, {
      ...defaultFilters,
      minRating: 4.0,
    });
    expect(byRating.map((p) => p.id)).toEqual(['a', 'c']);

    // limit 1 → first only
    const byLimit = applyMarketplaceFilters(photographers, {
      ...defaultFilters,
      limit: 1,
    });
    expect(byLimit.length).toBe(1);
  });
});
