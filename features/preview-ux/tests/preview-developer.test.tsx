import { describe, expect, it } from 'vitest';
import esMX from '@/messages/es-MX.json';
import { FeasibilityCards } from '../components/developer/FeasibilityCards';
import { HeatmapMock } from '../components/developer/HeatmapMock';
import { MigrationDiagram } from '../components/developer/MigrationDiagram';
import { PipelineTable } from '../components/developer/PipelineTable';
import { getNarvarteMock, getPreviewMockData } from '../lib/mock-data-provider';
import { FEASIBILITY_MOCK } from '../mock/feasibility-mock';

// Smoke / shape tests aligned con preview-comprador.test.tsx — sin jsdom.
describe('features/preview-ux components (developer)', () => {
  it('exporta HeatmapMock como componente función', () => {
    expect(typeof HeatmapMock).toBe('function');
    expect(HeatmapMock.name).toBe('HeatmapMock');
  });

  it('exporta FeasibilityCards como componente función', () => {
    expect(typeof FeasibilityCards).toBe('function');
    expect(FeasibilityCards.name).toBe('FeasibilityCards');
  });

  it('exporta MigrationDiagram como componente función', () => {
    expect(typeof MigrationDiagram).toBe('function');
    expect(MigrationDiagram.name).toBe('MigrationDiagram');
  });

  it('exporta PipelineTable como componente función', () => {
    expect(typeof PipelineTable).toBe('function');
    expect(PipelineTable.name).toBe('PipelineTable');
  });

  it('FEASIBILITY_MOCK tiene 5 proyectos pipeline con la forma esperada', () => {
    expect(FEASIBILITY_MOCK.pipelineProjects.length).toBe(5);
    for (const p of FEASIBILITY_MOCK.pipelineProjects) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.nameKey).toBe('string');
      expect(typeof p.unitCount).toBe('number');
      expect(['announced', 'in_progress', 'presale']).toContain(p.status);
    }
    expect(typeof FEASIBILITY_MOCK.roiPct).toBe('number');
    expect(typeof FEASIBILITY_MOCK.absorptionMonths).toBe('number');
    expect(typeof FEASIBILITY_MOCK.competitorUnits).toBe('number');
    expect(typeof FEASIBILITY_MOCK.pricePerM2Mxn).toBe('number');
  });

  it('NARVARTE_MOCK expone 3 alpha zones y migrationPoints con coords', () => {
    const narvarte = getNarvarteMock();
    expect(narvarte.alphaZones.length).toBe(3);
    expect(narvarte.migrationPoints.length).toBeGreaterThan(0);
    for (const z of narvarte.alphaZones) {
      expect(typeof z.zone_id).toBe('string');
      expect(typeof z.alpha_score).toBe('number');
    }
    for (const m of narvarte.migrationPoints) {
      // Slugs only — never UUID.
      expect(m.origin_scope_id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(m.dest_scope_id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(typeof m.volume).toBe('number');
    }
  });

  it('getPreviewMockData("developer") devuelve bundle con feasibility', () => {
    const bundle = getPreviewMockData('developer');
    expect(bundle.feasibility).toBeDefined();
    expect(bundle.feasibility.pipelineProjects.length).toBe(5);
  });

  it('PreviewDeveloper i18n namespace expone hero + flow + cta_final', () => {
    const ns = (esMX as Record<string, unknown>).PreviewDeveloper as
      | Record<string, unknown>
      | undefined;
    expect(ns).toBeDefined();
    if (!ns) return;
    expect(typeof ns.meta_title).toBe('string');
    expect(typeof ns.meta_description).toBe('string');
    const hero = ns.hero as Record<string, unknown>;
    expect(typeof hero.title).toBe('string');
    expect(typeof hero.cta_primary).toBe('string');
    const flow = ns.flow as Record<string, Record<string, unknown> | undefined>;
    const map = flow.map ?? {};
    const feasibility = flow.feasibility ?? {};
    const alpha = flow.alpha ?? {};
    const migration = flow.migration ?? {};
    const pipeline = flow.pipeline ?? {};
    expect(typeof map.title).toBe('string');
    expect(typeof feasibility.title).toBe('string');
    expect(typeof alpha.title).toBe('string');
    expect(typeof migration.title).toBe('string');
    expect(typeof pipeline.title).toBe('string');
    const ctaFinal = ns.cta_final as Record<string, unknown>;
    expect(typeof ctaFinal.label).toBe('string');
  });

  it('PreviewDeveloper.flow.pipeline.projects tiene 5 nombres traducidos', () => {
    const ns = (esMX as Record<string, unknown>).PreviewDeveloper as Record<string, unknown>;
    const flow = ns.flow as Record<string, Record<string, unknown> | undefined>;
    const pipeline = (flow.pipeline ?? {}) as Record<string, unknown>;
    const projects = (pipeline.projects ?? {}) as Record<string, string | undefined>;
    const expectedKeys = [
      'project_vertex',
      'project_meridiano',
      'project_allure',
      'project_parque',
      'project_arboleda',
    ];
    for (const k of expectedKeys) {
      const value = projects[k];
      expect(typeof value).toBe('string');
      expect(value?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
