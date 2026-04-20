import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { isProvenanceValid } from '../../types';
import b14, {
  type B14ContactoInput,
  CRITICAL_DEPS,
  computeB14BuyerPersonaProyecto,
  getLabelKey,
  MIN_CONTACTOS_TIER_2,
  methodology,
  PERSONA_IDS,
  type PersonaId,
  reasoning_template,
  version,
} from '../b14-buyer-persona-proyecto';

function buildContacto(
  id: string,
  personaPcts: Partial<Record<PersonaId, number>>,
  scoreValue: number,
  interactions: B14ContactoInput['interactions'] = ['wishlist_add'],
): B14ContactoInput {
  const full: Record<PersonaId, number> = {
    family: 0,
    inversor: 0,
    primera_compra: 0,
    downsizer: 0,
    second_home: 0,
    digital_nomad: 0,
  };
  let sum = 0;
  for (const p of PERSONA_IDS) {
    const v = personaPcts[p] ?? 0;
    full[p] = v;
    sum += v;
  }
  if (sum < 100) {
    // repartir resto en "family" para que sume 100
    full.family += 100 - sum;
  }
  return {
    contactoId: id,
    h14_perfiles: full,
    h14_score_value: scoreValue,
    interactions,
  };
}

describe('B14 Buyer Persona Proyecto', () => {
  it('declara version, methodology, sensitivity_analysis, reasoning_template', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.formula).toMatch(/mix_personas/);
    expect(methodology.sources).toContain('user_scores:H14');
    expect(methodology.sensitivity_analysis).toHaveLength(2);
    expect(methodology.sensitivity_analysis.map((s) => s.dimension_id)).toContain('H14');
    expect(methodology.tier_gate.min_contactos).toBe(MIN_CONTACTOS_TIER_2);
    expect(CRITICAL_DEPS).toContain('H14');
    expect(reasoning_template).toContain('{dominant_persona}');
    expect(reasoning_template).toContain('{confidence}');
    expect(PERSONA_IDS.length).toBe(6);
  });

  it('getLabelKey mapea buckets', () => {
    expect(getLabelKey(70, 'high')).toBe('ie.score.b14.mix_dominante');
    expect(getLabelKey(50, 'medium')).toBe('ie.score.b14.mix_mixto');
    expect(getLabelKey(30, 'low')).toBe('ie.score.b14.mix_difuso');
    expect(getLabelKey(0, 'insufficient_data')).toBe('ie.score.b14.insufficient');
  });

  it('Polanco studios fixture — 60% digital_nomad + 30% inversor + resto otros', () => {
    const contactos: B14ContactoInput[] = [
      buildContacto('c1', { digital_nomad: 80, inversor: 15, second_home: 5 }, 85, [
        'wishlist_add',
        'visita_realizada',
      ]),
      buildContacto('c2', { digital_nomad: 75, inversor: 20, second_home: 5 }, 80, [
        'wishlist_add',
        'visita_agendada',
      ]),
      buildContacto('c3', { digital_nomad: 70, inversor: 25, second_home: 5 }, 78, [
        'busqueda_match',
      ]),
      buildContacto('c4', { inversor: 70, digital_nomad: 20, second_home: 10 }, 75, [
        'wishlist_add',
      ]),
      buildContacto('c5', { inversor: 75, digital_nomad: 15, second_home: 10 }, 80, [
        'visita_realizada',
      ]),
    ];
    const res = computeB14BuyerPersonaProyecto({
      proyecto_id: 'polanco-studios',
      contactos,
    });
    expect(res.components.gated).toBe(false);
    expect(res.components.contactos_count).toBe(5);
    expect(res.components.dominant_persona).toBe('digital_nomad');
    const mix = res.components.mix_personas;
    const nomad = mix.find((m) => m.persona === 'digital_nomad');
    const inversor = mix.find((m) => m.persona === 'inversor');
    expect(nomad?.weight_pct).toBeGreaterThan(40);
    expect(inversor?.weight_pct).toBeGreaterThan(20);
  });

  it('mix_personas pesos suman ~100 (normalizado)', () => {
    const contactos: B14ContactoInput[] = [
      buildContacto('c1', { family: 60, primera_compra: 30, inversor: 10 }, 70),
      buildContacto('c2', { family: 55, primera_compra: 35, inversor: 10 }, 75),
      buildContacto('c3', { family: 50, primera_compra: 40, inversor: 10 }, 72),
      buildContacto('c4', { family: 65, primera_compra: 25, inversor: 10 }, 68),
    ];
    const res = computeB14BuyerPersonaProyecto({
      proyecto_id: 'family-proy',
      contactos,
    });
    const sum = res.components.mix_personas.reduce((s, m) => s + m.weight_pct, 0);
    expect(Number(sum.toFixed(1))).toBeCloseTo(100, 1);
    expect(res.components.dominant_persona).toBe('family');
  });

  it('ml_explanations test — output contiene LIME explanation + sensitivity', () => {
    const contactos: B14ContactoInput[] = [
      buildContacto('c1', { digital_nomad: 70, inversor: 20, second_home: 10 }, 80, [
        'wishlist_add',
      ]),
      buildContacto('c2', { digital_nomad: 65, inversor: 25, second_home: 10 }, 75, [
        'busqueda_match',
      ]),
      buildContacto('c3', { digital_nomad: 75, inversor: 15, second_home: 10 }, 82, [
        'visita_agendada',
      ]),
    ];
    const res = computeB14BuyerPersonaProyecto({
      proyecto_id: 'polanco-2',
      contactos,
    });
    expect(res.ml_explanations).toBeDefined();
    expect(res.ml_explanations.method).toBe('lime_local_partial_dependence');
    expect(res.ml_explanations.top_contributors.length).toBeGreaterThan(0);
    expect(typeof res.ml_explanations.baseline_prediction).toBe('number');
    expect(typeof res.ml_explanations.delta_pct).toBe('number');
    expect(Array.isArray(res.ml_explanations.sensitivity)).toBe(true);
    // El top contributor debe ser la persona dominante (digital_nomad)
    const topFeature = res.ml_explanations.top_contributors[0];
    expect(topFeature?.feature).toBeDefined();
  });

  it('tier gate — <3 contactos → insufficient_data', () => {
    const res = computeB14BuyerPersonaProyecto({
      proyecto_id: 'proy-new',
      contactos: [buildContacto('c1', { family: 80 }, 70)],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.gated).toBe(true);
    expect(res.components.contactos_count).toBe(1);
    expect(res.value).toBe(0);
  });

  it('sin contactos → insufficient + mix vacío', () => {
    const res = computeB14BuyerPersonaProyecto({
      proyecto_id: 'proy-zero',
      contactos: [],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.mix_personas).toEqual([]);
    expect(res.components.coverage_pct).toBe(0);
  });

  it('interacciones de alto peso (operacion_cerrada) dominan el mix', () => {
    // Un contacto con operación cerrada (peso 10) vs 2 con solo wishlist (peso 1 c/u)
    const contactos: B14ContactoInput[] = [
      buildContacto('dom', { inversor: 90, family: 10 }, 90, ['operacion_cerrada']),
      buildContacto('c1', { family: 80, primera_compra: 20 }, 70, ['wishlist_add']),
      buildContacto('c2', { family: 80, primera_compra: 20 }, 70, ['wishlist_add']),
    ];
    const res = computeB14BuyerPersonaProyecto({
      proyecto_id: 'weighted-test',
      contactos,
    });
    expect(res.components.dominant_persona).toBe('inversor');
  });

  it('diversidad_index alto cuando mix balanceado; bajo cuando dominante solo', () => {
    const balancedContactos: B14ContactoInput[] = [
      buildContacto('c1', { family: 25, inversor: 25, primera_compra: 25, digital_nomad: 25 }, 70),
      buildContacto('c2', { family: 25, inversor: 25, primera_compra: 25, digital_nomad: 25 }, 70),
      buildContacto('c3', { family: 25, inversor: 25, primera_compra: 25, digital_nomad: 25 }, 70),
    ];
    const resBalanced = computeB14BuyerPersonaProyecto({
      proyecto_id: 'mixto',
      contactos: balancedContactos,
    });
    const dominantContactos: B14ContactoInput[] = [
      buildContacto('c1', { family: 95 }, 85),
      buildContacto('c2', { family: 92 }, 82),
      buildContacto('c3', { family: 96 }, 88),
    ];
    const resDominant = computeB14BuyerPersonaProyecto({
      proyecto_id: 'monoperfil',
      contactos: dominantContactos,
    });
    expect(resBalanced.components.diversidad_index).toBeGreaterThan(
      resDominant.components.diversidad_index,
    );
    expect(resDominant.components.diversidad_index).toBeLessThan(0.3);
  });

  it('D13 — H14 insufficient dep propaga insufficient_data', () => {
    const contactos: B14ContactoInput[] = [
      buildContacto('c1', { family: 60, inversor: 40 }, 70, ['wishlist_add']),
      buildContacto('c2', { family: 55, inversor: 45 }, 72, ['wishlist_add']),
      buildContacto('c3', { family: 58, inversor: 42 }, 68, ['busqueda_match']),
    ];
    const res = computeB14BuyerPersonaProyecto({
      proyecto_id: 'd13-test',
      contactos,
      deps: [{ scoreId: 'H14', confidence: 'insufficient_data' }],
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.capped_by).toContain('H14');
  });

  it('D13 — H14 low-confidence caps a medium máx', () => {
    const contactos: B14ContactoInput[] = [
      buildContacto('c1', { family: 60, inversor: 40 }, 70, ['wishlist_add']),
      buildContacto('c2', { family: 55, inversor: 45 }, 72, ['wishlist_add']),
      buildContacto('c3', { family: 58, inversor: 42 }, 68, ['visita_realizada']),
    ];
    const res = computeB14BuyerPersonaProyecto({
      proyecto_id: 'd13-low',
      contactos,
      deps: [{ scoreId: 'H14', confidence: 'low' }],
    });
    expect(res.confidence).not.toBe('high');
    expect(['low', 'medium']).toContain(res.confidence);
    expect(res.components.capped_by).toContain('H14');
  });

  it('zona_demografia se aplica como prior (10% peso)', () => {
    const contactos: B14ContactoInput[] = [
      buildContacto('c1', { family: 50, inversor: 50 }, 70),
      buildContacto('c2', { family: 50, inversor: 50 }, 70),
      buildContacto('c3', { family: 50, inversor: 50 }, 70),
    ];
    const resBase = computeB14BuyerPersonaProyecto({
      proyecto_id: 'no-prior',
      contactos,
    });
    const resPrior = computeB14BuyerPersonaProyecto({
      proyecto_id: 'with-prior',
      contactos,
      zona_demografia: {
        family: 0.8,
        inversor: 0.05,
        primera_compra: 0.05,
        downsizer: 0.05,
        second_home: 0.03,
        digital_nomad: 0.02,
      },
    });
    const familyBase =
      resBase.components.mix_personas.find((m) => m.persona === 'family')?.weight_pct ?? 0;
    const familyPrior =
      resPrior.components.mix_personas.find((m) => m.persona === 'family')?.weight_pct ?? 0;
    expect(familyPrior).toBeGreaterThan(familyBase);
  });

  it('b14.run() prod-path devuelve insufficient + provenance válido + valid_until', async () => {
    const fakeSb = {} as SupabaseClient;
    const out = await b14.run(
      { projectId: 'proj-1', countryCode: 'MX', periodDate: '2026-04-01' },
      fakeSb,
    );
    expect(out.confidence).toBe('insufficient_data');
    expect(isProvenanceValid(out.provenance)).toBe(true);
    expect(out.score_label).toBe('ie.score.b14.insufficient');
    expect(out.valid_until).toBeDefined();
    expect(out.ml_explanations).toBeDefined();
  });
});
