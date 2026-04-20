import { describe, expect, it } from 'vitest';
import { computeC04Objection, getLabelKey, methodology, version } from '../c04-objection-killer';

describe('C04 Objection Killer AI', () => {
  it('declara methodology + ai_narrative=true + 6 categorías', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
    expect(methodology.ai_narrative).toBe(true);
    expect(methodology.categories).toHaveLength(6);
  });

  it('Criterio done plan: objeción "el precio está alto" → respuesta con F09+A12', () => {
    const res = computeC04Objection({
      objection_text: 'El precio está muy alto para la zona',
      available_scores: { F09: 65, A12: 70, F08: 75 },
    });
    expect(res.components.category).toBe('precio');
    const evScoreIds = res.components.evidences.map((e) => e.score_id);
    expect(evScoreIds).toContain('F09');
    expect(evScoreIds).toContain('A12');
  });

  it('detecta categoría ubicación', () => {
    const res = computeC04Objection({
      objection_text: 'la zona está muy lejos del centro',
      available_scores: { F08: 80, N08: 75 },
    });
    expect(res.components.category).toBe('ubicacion');
  });

  it('detecta categoría seguridad', () => {
    const res = computeC04Objection({
      objection_text: 'hay mucha inseguridad y robos',
      available_scores: { F01: 70, N04: 65 },
    });
    expect(res.components.category).toBe('seguridad');
  });

  it('sin evidencias disponibles → insufficient_data', () => {
    const res = computeC04Objection({
      objection_text: 'el precio está alto',
      available_scores: {},
    });
    expect(res.confidence).toBe('insufficient_data');
    expect(res.components.missing_sources.length).toBeGreaterThan(0);
  });

  it('evidencias all disponibles + match alto → confidence high', () => {
    const res = computeC04Objection({
      objection_text: 'precio caro costoso',
      available_scores: { F09: 80, A12: 75 },
    });
    expect(res.confidence).toBe('high');
    expect(res.value).toBeGreaterThanOrEqual(70);
  });

  it('detected_category override skipea detección', () => {
    const res = computeC04Objection({
      objection_text: 'texto genérico',
      detected_category: 'construccion',
      available_scores: { H05: 80 },
    });
    expect(res.components.category).toBe('construccion');
  });

  it('evidencia refuta si value >= 70', () => {
    const res = computeC04Objection({
      objection_text: 'precio caro',
      available_scores: { F09: 85, A12: 75 },
    });
    expect(res.components.evidences.every((e) => e.direction === 'refuta')).toBe(true);
  });

  it('getLabelKey mapea categoría', () => {
    expect(getLabelKey('precio', 'high')).toBe('ie.score.c04.precio');
    expect(getLabelKey('ubicacion', 'medium')).toBe('ie.score.c04.ubicacion');
    expect(getLabelKey('otra', 'insufficient_data')).toBe('ie.score.c04.insufficient');
  });
});
