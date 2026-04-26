import 'server-only';
import type { DesarrollosFilters, TabKey } from './filter-schemas';

export interface DesarrolloSummary {
  id: string;
  name: string;
  slug: string;
  desarrolladoraName: string | null;
  ciudad: string | null;
  colonia: string | null;
  countryCode: string;
  tipo: string;
  operacion: 'venta' | 'renta';
  priceFrom: number | null;
  priceTo: number | null;
  currency: string;
  unitsAvailable: number | null;
  unitsTotal: number | null;
  bedrooms: number[] | null;
  amenities: string[];
  photoUrl: string | null;
  dmxScore: number | null;
  qualityScore: number | null;
  momentumDelta: number | null;
  exclusividad: {
    mesesExclusividad: number;
    mesesContrato: number;
    comisionPct: number;
  } | null;
  isPlaceholder: boolean;
  boundarySource: 'real' | 'synthetic_h1' | 'pending';
  updatedAt: string | null;
}

export interface DesarrollosLoadResult {
  projects: DesarrolloSummary[];
  tabCounts: Record<TabKey, number>;
  nextCursor: string | null;
  asesorId: string | null;
  isStub: true;
  reason: string;
}

export async function loadDesarrollos(
  _filters: DesarrollosFilters,
  asesorId: string | null,
): Promise<DesarrollosLoadResult> {
  return {
    projects: [],
    tabCounts: { own: 0, exclusive: 0, dmx: 0, mls: 0 },
    nextCursor: null,
    asesorId,
    isStub: true,
    reason: 'STUB FASE 15 M11 — tabla `proyectos` no existe en 13.C. Activar cuando shipped.',
  };
}
