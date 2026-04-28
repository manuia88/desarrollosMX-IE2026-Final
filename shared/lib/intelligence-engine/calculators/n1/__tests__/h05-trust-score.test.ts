import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import h05, {
  computeH05TrustScore,
  DEFAULT_WEIGHTS,
  GATE_MIN_DELIVERIES,
  GATE_MIN_PROJECTS,
  getLabelKey,
  methodology,
  PROFECO_PENALTY_MULTIPLIER,
  PROFECO_PENALTY_THRESHOLD,
  reasoning_template,
  version,
} from '../h05-trust-score';

describe('H05 Trust Score calculator', () => {
  it('declara version, methodology, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.sources).toContain('developer_reviews');
    expect(methodology.sources).toContain('ops_cerradas');
    expect(methodology.triggers_cascade).toContain('feedback_registered');
    expect(DEFAULT_WEIGHTS.reviews_avg).toBe(0.4);
    expect(
      DEFAULT_WEIGHTS.cumplimiento + DEFAULT_WEIGHTS.volumen + DEFAULT_WEIGHTS.reviews_avg,
    ).toBeCloseTo(1, 5);
    expect(methodology.tier_gate.min_projects).toBe(GATE_MIN_PROJECTS);
    expect(reasoning_template).toContain('{score_value}');
    expect(reasoning_template).toContain('{confidence}');
  });

  it('getLabelKey mapea tiers', () => {
    expect(getLabelKey(90, 'high')).toBe('ie.score.h05.excelente');
    expect(getLabelKey(75, 'high')).toBe('ie.score.h05.alto');
    expect(getLabelKey(55, 'medium')).toBe('ie.score.h05.aceptable');
    expect(getLabelKey(35, 'low')).toBe('ie.score.h05.bajo');
    expect(getLabelKey(15, 'low')).toBe('ie.score.h05.critico');
    expect(getLabelKey(90, 'insufficient_data')).toBe('ie.score.h05.insufficient');
  });

  it('dev con 15 proyectos, 100% on-time, reviews 4.8/5 → score ≥90', () => {
    const res = computeH05TrustScore({
      desarrolladora_id: 'dev-premium',
      reviews_avg: 4.8,
      cumplimiento_entrega_pct: 100,
      volumen_ops_3y_count: 50, // 50·2=100 → full
      projects_count: 15,
      deliveries_count: 10,
      profeco_quejas_count: 0,
      confidences: { reviews_avg: 'high', cumplimiento: 'high', volumen: 'high' },
    });
    // reviews_normalized = (4.8/5)·100 = 96
    // volumen_normalized = 100
    // score = 0.4·96 + 0.3·100 + 0.3·100 = 38.4 + 30 + 30 = 98.4 → 98
    expect(res.value).toBeGreaterThanOrEqual(90);
    expect(res.confidence).toBe('high');
    expect(res.components.gated).toBe(false);
    expect(res.components.penalty_applied).toBe(false);
  });

  it('gating Tier 2 — desarrolladora con <10 proyectos → insufficient_data', () => {
    const res = computeH05TrustScore({
      desarrolladora_id: 'dev-small',
      reviews_avg: 5,
      cumplimiento_entrega_pct: 100,
      volumen_ops_3y_count: 20,
      projects_count: 5, // BELOW GATE
      deliveries_count: 3,
      profeco_quejas_count: 0,
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.gated).toBe(true);
    expect(res.components.gate_reason).toContain('5 proyectos');
    expect(res.value).toBe(0);
  });

  it('gating Tier 2 — desarrolladora con 0 entregas → gated aunque tenga 20 proyectos', () => {
    const res = computeH05TrustScore({
      desarrolladora_id: 'dev-no-deliveries',
      reviews_avg: 4.5,
      cumplimiento_entrega_pct: 80,
      volumen_ops_3y_count: 30,
      projects_count: 20,
      deliveries_count: 0, // sin entregas históricas
      profeco_quejas_count: 0,
    });
    expect(res.components.gated).toBe(true);
    expect(res.components.gate_reason).toContain('entregas');
    expect(res.confidence).toBe('insufficient_data');
  });

  it('PROFECO penalty — quejas > 3 → score × 0.8', () => {
    const resNoPenalty = computeH05TrustScore({
      desarrolladora_id: 'dev-penalty',
      reviews_avg: 4.0,
      cumplimiento_entrega_pct: 90,
      volumen_ops_3y_count: 40,
      projects_count: 12,
      deliveries_count: 8,
      profeco_quejas_count: PROFECO_PENALTY_THRESHOLD, // 3 exacto → NO penalty
    });
    const resPenalty = computeH05TrustScore({
      desarrolladora_id: 'dev-penalty',
      reviews_avg: 4.0,
      cumplimiento_entrega_pct: 90,
      volumen_ops_3y_count: 40,
      projects_count: 12,
      deliveries_count: 8,
      profeco_quejas_count: 5,
    });
    expect(resNoPenalty.components.penalty_applied).toBe(false);
    expect(resPenalty.components.penalty_applied).toBe(true);
    // score_raw igual en ambos
    expect(resNoPenalty.components.score_raw).toBeCloseTo(resPenalty.components.score_raw, 1);
    // value penalty = raw × 0.8, redondeado
    expect(resPenalty.value).toBeCloseTo(
      Math.round(resNoPenalty.components.score_raw * PROFECO_PENALTY_MULTIPLIER),
      0,
    );
  });

  it('D9 fallback — reviews missing → weights redistribuidos', () => {
    const res = computeH05TrustScore({
      desarrolladora_id: 'dev-no-reviews',
      reviews_avg: null,
      cumplimiento_entrega_pct: 95,
      volumen_ops_3y_count: 40,
      projects_count: 15,
      deliveries_count: 10,
    });
    expect(res.components.missing_dimensions).toContain('reviews_avg');
    expect(res.components.available_count).toBe(2);
    // weights renormalized: cumplimiento 0.3/0.6=0.5; volumen 0.3/0.6=0.5
    expect(res.components.weights_applied.cumplimiento).toBeCloseTo(0.5, 3);
    expect(res.components.weights_applied.volumen).toBeCloseTo(0.5, 3);
    expect(res.confidence).toBe('medium');
  });

  it('volumen normalizado — 50 ops = 100 score; 10 ops = 20 score', () => {
    const fullVol = computeH05TrustScore({
      desarrolladora_id: 'dev-X',
      reviews_avg: 4,
      cumplimiento_entrega_pct: 80,
      volumen_ops_3y_count: 100, // saturado
      projects_count: 15,
      deliveries_count: 10,
    });
    const midVol = computeH05TrustScore({
      desarrolladora_id: 'dev-Y',
      reviews_avg: 4,
      cumplimiento_entrega_pct: 80,
      volumen_ops_3y_count: 10,
      projects_count: 15,
      deliveries_count: 10,
    });
    // fullVol volumen_norm = 100; midVol volumen_norm = 20
    // fullVol > midVol
    expect(fullVol.value).toBeGreaterThan(midVol.value);
  });

  it('bypassGate permite computar score aún sin llegar al umbral', () => {
    const res = computeH05TrustScore(
      {
        desarrolladora_id: 'dev-bypass',
        reviews_avg: 4.5,
        cumplimiento_entrega_pct: 90,
        volumen_ops_3y_count: 20,
        projects_count: 3,
        deliveries_count: 0,
      },
      { bypassGate: true },
    );
    expect(res.components.gated).toBe(false);
    expect(res.value).toBeGreaterThan(0);
  });

  it('h05.run() prod-path devuelve insufficient + provenance válido', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await h05.run(
      { projectId: 'dev-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.h05.insufficient');
  });

  it('constants export GATE_MIN_DELIVERIES=1, GATE_MIN_PROJECTS=10', () => {
    expect(GATE_MIN_DELIVERIES).toBe(1);
    expect(GATE_MIN_PROJECTS).toBe(10);
  });
});
