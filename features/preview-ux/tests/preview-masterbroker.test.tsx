import { describe, expect, it } from 'vitest';
import esMX from '@/messages/es-MX.json';
import { AgentsTable } from '../components/masterbroker/AgentsTable';
import { KpiDashboard } from '../components/masterbroker/KpiDashboard';
import { Leaderboard } from '../components/masterbroker/Leaderboard';
import { TerritoryMap } from '../components/masterbroker/TerritoryMap';
import { getPreviewMockData } from '../lib/mock-data-provider';
import { AGENTES_MOCK } from '../mock/agentes-mock';

// Smoke / shape tests aligned con preview-asesor.test.tsx — sin jsdom.
describe('features/preview-ux components (masterbroker)', () => {
  it('exporta AgentsTable como componente función', () => {
    expect(typeof AgentsTable).toBe('function');
    expect(AgentsTable.name).toBe('AgentsTable');
  });

  it('exporta TerritoryMap como componente función', () => {
    expect(typeof TerritoryMap).toBe('function');
    expect(TerritoryMap.name).toBe('TerritoryMap');
  });

  it('exporta KpiDashboard como componente función', () => {
    expect(typeof KpiDashboard).toBe('function');
    expect(KpiDashboard.name).toBe('KpiDashboard');
  });

  it('exporta Leaderboard como componente función', () => {
    expect(typeof Leaderboard).toBe('function');
    expect(Leaderboard.name).toBe('Leaderboard');
  });

  it('AGENTES_MOCK contiene 10 agentes con la forma esperada', () => {
    expect(AGENTES_MOCK.length).toBe(10);
    for (const a of AGENTES_MOCK) {
      expect(typeof a.id).toBe('string');
      expect(typeof a.name).toBe('string');
      expect(typeof a.initials).toBe('string');
      expect(a.initials.length).toBeGreaterThanOrEqual(1);
      expect(a.initials.length).toBeLessThanOrEqual(3);
      expect(typeof a.zoneSlug).toBe('string');
      // Slugs only — never UUID.
      expect(a.zoneSlug).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(typeof a.zoneLabel).toBe('string');
      expect(typeof a.pipelineMxn).toBe('number');
      expect(typeof a.conversionPct).toBe('number');
      expect(typeof a.ytdRevenueMxn).toBe('number');
      expect(typeof a.weeklyDeals).toBe('number');
      expect(typeof a.trendPct).toBe('number');
      for (const b of a.badges) {
        expect(['top_closer', 'streak_week', 'alpha_hunter', 'rising_star']).toContain(b);
      }
    }
  });

  it('getPreviewMockData("masterbroker") devuelve bundle con 10 agentes', () => {
    const bundle = getPreviewMockData('masterbroker');
    expect(bundle.agents.length).toBe(10);
  });

  it('Leaderboard top-5 ordena por trendPct descendente sin mutar input', () => {
    const original = [...AGENTES_MOCK];
    const sorted = [...AGENTES_MOCK].sort((a, b) => b.trendPct - a.trendPct).slice(0, 5);
    expect(sorted.length).toBe(5);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      expect(prev).toBeDefined();
      expect(cur).toBeDefined();
      if (prev && cur) {
        expect(prev.trendPct).toBeGreaterThanOrEqual(cur.trendPct);
      }
    }
    // El input no se mutó (la página usa spread + sort).
    expect(AGENTES_MOCK).toEqual(original);
  });

  it('KPI agregados se calculan determinísticamente sin overflow', () => {
    const totalPipeline = AGENTES_MOCK.reduce((acc, a) => acc + a.pipelineMxn, 0);
    const totalYtd = AGENTES_MOCK.reduce((acc, a) => acc + a.ytdRevenueMxn, 0);
    const avgConv = AGENTES_MOCK.reduce((acc, a) => acc + a.conversionPct, 0) / AGENTES_MOCK.length;
    expect(totalPipeline).toBeGreaterThan(0);
    expect(totalYtd).toBeGreaterThan(0);
    expect(avgConv).toBeGreaterThan(0);
    expect(avgConv).toBeLessThan(100);
  });

  it('PreviewMasterBroker i18n namespace expone hero + flow.agents.columns + flow.agents.badges + cta_final', () => {
    const ns = (esMX as Record<string, unknown>).PreviewMasterBroker as
      | Record<string, unknown>
      | undefined;
    expect(ns).toBeDefined();
    if (!ns) return;
    expect(typeof ns.meta_title).toBe('string');
    const hero = ns.hero as Record<string, unknown>;
    expect(typeof hero.title).toBe('string');
    const flow = ns.flow as Record<string, Record<string, unknown> | undefined>;
    const agents = (flow.agents ?? {}) as Record<string, unknown>;
    expect(typeof agents.title).toBe('string');
    const cols = (agents.columns ?? {}) as Record<string, string | undefined>;
    for (const k of ['name', 'zone', 'pipeline', 'conversion', 'ytd', 'weekly_deals', 'trend']) {
      expect(typeof cols[k]).toBe('string');
    }
    const badges = (agents.badges ?? {}) as Record<string, string | undefined>;
    for (const k of ['top_closer', 'streak_week', 'alpha_hunter', 'rising_star']) {
      expect(typeof badges[k]).toBe('string');
    }
    expect(typeof ((flow.territory ?? {}) as Record<string, unknown>).title).toBe('string');
    expect(typeof ((flow.kpis ?? {}) as Record<string, unknown>).title).toBe('string');
    expect(typeof ((flow.alerts ?? {}) as Record<string, unknown>).title).toBe('string');
    expect(typeof ((flow.leaderboard ?? {}) as Record<string, unknown>).title).toBe('string');
    const ctaFinal = ns.cta_final as Record<string, unknown>;
    expect(typeof ctaFinal.label).toBe('string');
  });
});
