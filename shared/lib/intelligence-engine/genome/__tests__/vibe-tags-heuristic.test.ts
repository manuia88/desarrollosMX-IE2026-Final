import { describe, expect, it } from 'vitest';
import { computeVibeTagsForColonia, VIBE_TAG_ORDER } from '../vibe-tags-heuristic';

describe('computeVibeTagsForColonia', () => {
  it('emite exactamente 10 vibe tags en el orden canónico', () => {
    const out = computeVibeTagsForColonia({
      coloniaId: 'test',
      scores: new Map(),
      dmxIndices: new Map(),
    });
    expect(out).toHaveLength(10);
    const ids = out.map((t) => t.vibe_tag_id);
    expect(ids).toEqual(VIBE_TAG_ORDER);
  });

  it('es determinística: mismo input → mismo output', () => {
    const input = {
      coloniaId: 'test',
      scores: new Map<string, number>([
        ['F01', 80],
        ['F03', 60],
        ['N08', 75],
        ['N10', 40],
        ['F04', 70],
      ]),
      dmxIndices: new Map<string, number>([
        ['DMX-FAM', 82],
        ['DMX-YNG', 55],
        ['DMX-GNT', 45],
        ['DMX-INV', 60],
        ['DMX-GRN', 48],
      ]),
    };
    const run1 = computeVibeTagsForColonia(input);
    const run2 = computeVibeTagsForColonia(input);
    expect(run1).toEqual(run2);
  });

  it('data faltante devuelve weight=0 sin tirar error', () => {
    const out = computeVibeTagsForColonia({
      coloniaId: 'empty',
      scores: new Map(),
      dmxIndices: new Map(),
    });
    for (const tag of out) {
      expect(tag.weight).toBeGreaterThanOrEqual(0);
      expect(tag.weight).toBeLessThanOrEqual(100);
    }
    const family = out.find((t) => t.vibe_tag_id === 'family');
    expect(family?.weight).toBe(0);
    const gentrifying = out.find((t) => t.vibe_tag_id === 'gentrifying');
    expect(gentrifying?.weight).toBe(0);
  });

  it('safety_perceived usa F01 directo (score 80 → weight 80)', () => {
    const out = computeVibeTagsForColonia({
      coloniaId: 'x',
      scores: new Map([['F01', 80]]),
      dmxIndices: new Map(),
    });
    const safety = out.find((t) => t.vibe_tag_id === 'safety_perceived');
    expect(safety?.weight).toBe(80);
  });

  it('gentrifying usa DMX-GNT directo (índice 65 → weight 65)', () => {
    const out = computeVibeTagsForColonia({
      coloniaId: 'x',
      scores: new Map(),
      dmxIndices: new Map([['DMX-GNT', 65]]),
    });
    const gent = out.find((t) => t.vibe_tag_id === 'gentrifying');
    expect(gent?.weight).toBe(65);
  });

  it('family usa DMX-FAM cuando existe; fallback promedio F04/N10/F01 si no', () => {
    const withFam = computeVibeTagsForColonia({
      coloniaId: 'x',
      scores: new Map(),
      dmxIndices: new Map([['DMX-FAM', 70]]),
    });
    expect(withFam.find((t) => t.vibe_tag_id === 'family')?.weight).toBe(70);

    const withoutFam = computeVibeTagsForColonia({
      coloniaId: 'y',
      scores: new Map([
        ['F04', 80],
        ['N10', 60],
        ['F01', 70],
      ]),
      dmxIndices: new Map(),
    });
    expect(withoutFam.find((t) => t.vibe_tag_id === 'family')?.weight).toBe(70);
  });

  it('weights todos entre 0 y 100', () => {
    const out = computeVibeTagsForColonia({
      coloniaId: 'edge',
      scores: new Map([
        ['F01', 150], // deliberadamente out-of-range — clamp debe funcionar
        ['F02', -50],
        ['F03', 200],
      ]),
      dmxIndices: new Map([['DMX-GNT', 999]]),
    });
    for (const tag of out) {
      expect(tag.weight).toBeGreaterThanOrEqual(0);
      expect(tag.weight).toBeLessThanOrEqual(100);
    }
  });
});
