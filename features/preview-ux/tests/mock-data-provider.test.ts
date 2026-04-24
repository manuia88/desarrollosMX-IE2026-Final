import { describe, expect, it } from 'vitest';
import { INDEX_CODES } from '@/shared/types/scores';
import { getNarvarteMock, getPreviewMockData } from '../lib/mock-data-provider';
import { PERSONA_TYPES } from '../types';

describe('mock-data-provider — bundle shape', () => {
  it('getPreviewMockData devuelve un bundle con las 4 secciones esperadas', () => {
    for (const persona of PERSONA_TYPES) {
      const bundle = getPreviewMockData(persona);
      expect(bundle).toBeDefined();
      expect(bundle.narvarte).toBeDefined();
      expect(bundle.clientProfiles).toBeDefined();
      expect(bundle.agents).toBeDefined();
      expect(bundle.feasibility).toBeDefined();
    }
  });

  it('bundle es estable (misma referencia) entre personas — data compartida', () => {
    const a = getPreviewMockData('comprador');
    const b = getPreviewMockData('developer');
    expect(a).toBe(b);
  });
});

describe('mock-data-provider — narvarte', () => {
  it('getNarvarteMock expone scope colonia + narvarte', () => {
    const narvarte = getNarvarteMock();
    expect(narvarte.scopeType).toBe('colonia');
    expect(narvarte.scopeId).toBe('narvarte');
    expect(typeof narvarte.label).toBe('string');
    expect(typeof narvarte.summary).toBe('string');
  });

  it('narvarte tiene exactamente 15 scores (uno por INDEX_CODE)', () => {
    const narvarte = getNarvarteMock();
    expect(narvarte.scores.length).toBe(15);
    expect(narvarte.scores.length).toBe(INDEX_CODES.length);
    const codes = new Set(narvarte.scores.map((s) => s.code));
    for (const code of INDEX_CODES) {
      expect(codes.has(code)).toBe(true);
    }
  });

  it('cada score respeta rangos y bandas del contrato', () => {
    const narvarte = getNarvarteMock();
    for (const s of narvarte.scores) {
      expect(s.value).toBeGreaterThanOrEqual(0);
      expect(s.value).toBeLessThanOrEqual(100);
      expect(s.percentile).toBeGreaterThanOrEqual(0);
      expect(s.percentile).toBeLessThanOrEqual(100);
      expect(['excelente', 'bueno', 'regular', 'bajo']).toContain(s.band);
      expect(typeof s.trend_pct_12m).toBe('number');
    }
  });

  it('narvarte expone pulse + causal + timeline con forma esperada', () => {
    const narvarte = getNarvarteMock();
    expect(typeof narvarte.pulse.heartbeat).toBe('number');
    expect(narvarte.pulse.vitals.appreciation).toBeGreaterThanOrEqual(0);
    expect(narvarte.pulse.vitals.liquidity).toBeGreaterThanOrEqual(0);
    expect(narvarte.pulse.vitals.demand).toBeGreaterThanOrEqual(0);
    expect(narvarte.pulse.vitals.momentum).toBeGreaterThanOrEqual(0);
    expect(narvarte.causal.drivers.length).toBeGreaterThan(0);
    expect(narvarte.timeline.length).toBe(12);
  });
});

describe('mock-data-provider — agents / profiles / feasibility', () => {
  it('agents tiene 10 asesores', () => {
    const { agents } = getPreviewMockData('masterbroker');
    expect(agents.length).toBe(10);
    for (const a of agents) {
      expect(typeof a.id).toBe('string');
      expect(typeof a.name).toBe('string');
      expect(typeof a.initials).toBe('string');
      expect(a.pipelineMxn).toBeGreaterThan(0);
      expect(a.conversionPct).toBeGreaterThanOrEqual(0);
      expect(a.conversionPct).toBeLessThanOrEqual(100);
    }
  });

  it('clientProfiles tiene 3 perfiles', () => {
    const { clientProfiles } = getPreviewMockData('asesor');
    expect(clientProfiles.length).toBe(3);
    for (const p of clientProfiles) {
      expect(typeof p.id).toBe('string');
      expect(['schools', 'commute', 'lifestyle']).toContain(p.priority);
      expect(p.proposedZones.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('feasibility tiene 5 proyectos en pipeline', () => {
    const { feasibility } = getPreviewMockData('developer');
    expect(feasibility.pipelineProjects.length).toBe(5);
    expect(typeof feasibility.roiPct).toBe('number');
    expect(typeof feasibility.absorptionMonths).toBe('number');
    expect(typeof feasibility.competitorUnits).toBe('number');
    expect(typeof feasibility.pricePerM2Mxn).toBe('number');
    for (const proj of feasibility.pipelineProjects) {
      expect(typeof proj.id).toBe('string');
      expect(typeof proj.nameKey).toBe('string');
      expect(proj.unitCount).toBeGreaterThan(0);
      expect(['announced', 'in_progress', 'presale']).toContain(proj.status);
    }
  });
});
