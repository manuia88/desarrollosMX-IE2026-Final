import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import c01, {
  BEHAVIOR_WEIGHTS,
  CRITICAL_DEPS,
  computeC01LeadScore,
  getLabelKey,
  MIN_SIGNALS_TIER_2,
  methodology,
  reasoning_template,
  version,
  WEIGHTS,
} from '../c01-lead-score';

describe('C01 Lead Score', () => {
  it('declara version, methodology, weights, sensitivity_analysis, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(WEIGHTS.feedback + WEIGHTS.behavior + WEIGHTS.match).toBeCloseTo(1, 5);
    expect(methodology.formula).toMatch(/feedback/);
    expect(methodology.sources).toContain('interactions');
    expect(methodology.sources).toContain('visitas');
    expect(methodology.sensitivity_analysis).toHaveLength(3);
    expect(methodology.triggers_cascade).toContain('feedback_registered');
    expect(methodology.tier_gate.min_signals).toBe(MIN_SIGNALS_TIER_2);
    expect(CRITICAL_DEPS).toEqual([]);
    expect(reasoning_template).toContain('{temperatura}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(75, 'high')).toBe('ie.score.c01.caliente');
    expect(getLabelKey(55, 'medium')).toBe('ie.score.c01.tibio');
    expect(getLabelKey(25, 'low')).toBe('ie.score.c01.frio');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.c01.insufficient');
  });

  it('happy path — 3 visitas + feedback hot + match bueno → score ≥80 caliente', () => {
    const res = computeC01LeadScore({
      contactoId: 'c-hot',
      feedback_sentimiento: 90,
      interactions_count: 12,
      visitas_agendadas: 3,
      visitas_realizadas: 3,
      presupuesto_declarado: 4_500_000,
      precio_objetivo: 4_500_000,
      match_scores_top3: [85, 82, 78],
    });
    expect(res.confidence).not.toBe('insufficient_data');
    expect(res.value).toBeGreaterThanOrEqual(80);
    expect(res.components.temperatura).toBe('caliente');
    // caliente + ya agendó → llamar
    expect(res.components.next_action).toBe('llamar');
  });

  it('lead frío — feedback bajo + sin interactions + match bajo → <40 frio esperar', () => {
    const res = computeC01LeadScore({
      contactoId: 'c-cold',
      feedback_sentimiento: 15,
      interactions_count: 0,
      visitas_agendadas: 0,
      visitas_realizadas: 0,
      presupuesto_declarado: null,
      precio_objetivo: null,
      match_scores_top3: [20, 25, 15],
    });
    expect(res.value).toBeLessThan(40);
    expect(res.components.temperatura).toBe('frio');
    expect(res.components.next_action).toBe('esperar');
  });

  it('caliente sin visitas agendadas → next_action agendar_visita', () => {
    // Feedback alto + muchas interactions pero 0 visitas → caliente por feedback+behavior
    const res = computeC01LeadScore({
      contactoId: 'c-hot-no-visit',
      feedback_sentimiento: 85,
      interactions_count: 10,
      visitas_agendadas: 0,
      visitas_realizadas: 0,
      presupuesto_declarado: 5_000_000,
      precio_objetivo: 5_000_000,
      match_scores_top3: [80, 78, 75],
    });
    expect(res.components.temperatura).toBe('caliente');
    expect(res.components.next_action).toBe('agendar_visita');
  });

  it('tibio + pocas interactions → enviar_dossier', () => {
    const res = computeC01LeadScore({
      contactoId: 'c-tibio-new',
      feedback_sentimiento: 50,
      interactions_count: 2,
      visitas_agendadas: 0,
      visitas_realizadas: 0,
      presupuesto_declarado: 3_000_000,
      precio_objetivo: 4_000_000,
      match_scores_top3: [55, 50, 48],
    });
    // 50·.3 + behavior·.4 + ~51·.3 → tibio
    expect(res.components.temperatura).toBe('tibio');
    expect(res.components.next_action).toBe('enviar_dossier');
  });

  it('tibio + ≥3 interactions → agendar_visita', () => {
    const res = computeC01LeadScore({
      contactoId: 'c-tibio-engaged',
      feedback_sentimiento: 55,
      interactions_count: 5,
      visitas_agendadas: 0,
      visitas_realizadas: 0,
      presupuesto_declarado: 3_500_000,
      precio_objetivo: 4_500_000,
      match_scores_top3: [50, 48, 45],
    });
    expect(res.components.temperatura).toBe('tibio');
    expect(res.components.next_action).toBe('agendar_visita');
  });

  it('affordability bonus — presupuesto=precio → bonus completo 30', () => {
    const res = computeC01LeadScore({
      contactoId: 'c-aff',
      feedback_sentimiento: 50,
      interactions_count: 0,
      visitas_agendadas: 0,
      visitas_realizadas: 0,
      presupuesto_declarado: 5_000_000,
      precio_objetivo: 5_000_000,
      match_scores_top3: [50],
    });
    expect(res.components.affordability_bonus).toBeCloseTo(
      BEHAVIOR_WEIGHTS.affordability_max_bonus,
      1,
    );
  });

  it('tier gate — solo feedback, sin behavior ni match → insufficient_data', () => {
    const res = computeC01LeadScore({
      contactoId: 'c-gated',
      feedback_sentimiento: 60,
      interactions_count: 0,
      visitas_agendadas: 0,
      visitas_realizadas: 0,
      presupuesto_declarado: null,
      precio_objetivo: null,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.gated).toBe(true);
    expect(res.components.available_signals.length).toBeLessThan(MIN_SIGNALS_TIER_2);
    expect(res.value).toBe(0);
  });

  it('match_scores_top3 ausente pero feedback + behavior → tibio/caliente con match=50 neutro', () => {
    const res = computeC01LeadScore({
      contactoId: 'c-nomatch',
      feedback_sentimiento: 70,
      interactions_count: 5,
      visitas_agendadas: 1,
      visitas_realizadas: 1,
      presupuesto_declarado: 4_000_000,
      precio_objetivo: 5_000_000,
    });
    expect(res.components.available_signals).toContain('feedback');
    expect(res.components.available_signals).toContain('behavior');
    expect(res.components.available_signals).not.toContain('match');
    expect(res.components.match).toBe(50);
    expect(res.value).toBeGreaterThan(0);
  });

  it('boundary — score exactamente 70 → caliente', () => {
    // feedback 70, behavior 70, match 70 → 70
    const res = computeC01LeadScore({
      contactoId: 'c-boundary',
      feedback_sentimiento: 70,
      interactions_count: 0,
      visitas_agendadas: 0,
      visitas_realizadas: 3, // 60
      presupuesto_declarado: 5_000_000,
      precio_objetivo: 15_000_000, // affordability = 10
      // behavior = 0 + 0 + 60 + 10 = 70
      match_scores_top3: [70],
    });
    expect(res.components.temperatura).toBe('caliente');
    expect(res.value).toBe(70);
  });

  it('coverage_pct se reporta correctamente', () => {
    const res = computeC01LeadScore({
      contactoId: 'c-cov',
      feedback_sentimiento: 60,
      interactions_count: 3,
      visitas_agendadas: 1,
      visitas_realizadas: 0,
      presupuesto_declarado: 3_000_000,
      precio_objetivo: 4_000_000,
      match_scores_top3: [55, 50],
    });
    expect(res.components.coverage_pct).toBe(100);
    expect(res.components.available_signals).toHaveLength(3);
  });

  it('c01.run() prod-path insufficient + provenance válido + valid_until', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await c01.run(
      { userId: 'contacto-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.c01.insufficient');
    expect(out.valid_until).toBeDefined();
  });
});
