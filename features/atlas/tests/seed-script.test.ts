import { describe, expect, it } from 'vitest';
import {
  assembleContentMd,
  buildSystemPrompt,
  buildUserPrompt,
  estimateBatchCostUsd,
  sectionsToJsonb,
} from '../../../scripts/seed-living-atlas-wiki';

const sectionsFixture = {
  intro: 'a'.repeat(200),
  historia: 'b'.repeat(200),
  caracter: 'c'.repeat(200),
  transporte: 'd'.repeat(200),
  gastronomia: 'e'.repeat(200),
  vida_cultural: 'f'.repeat(200),
  seguridad_vida: 'g'.repeat(200),
  mercado_inmobiliario: 'h'.repeat(200),
} as const;

describe('seed-living-atlas-wiki helpers', () => {
  it('estimateBatchCostUsd stays under $3 for 200 colonias default tokens', () => {
    const cost = estimateBatchCostUsd(200);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(3);
  });

  it('estimateBatchCostUsd scales linearly with count', () => {
    const c100 = estimateBatchCostUsd(100);
    const c200 = estimateBatchCostUsd(200);
    expect(Math.abs(c200 - c100 * 2)).toBeLessThan(0.01);
  });

  it('estimateBatchCostUsd over cap when tokens inflate', () => {
    const cost = estimateBatchCostUsd(200, 5000, 15000);
    expect(cost).toBeGreaterThan(3);
  });

  it('buildSystemPrompt mentions JSON-only output', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toContain('json');
  });

  it('buildUserPrompt includes colonia label + alcaldia', () => {
    const prompt = buildUserPrompt({
      zone_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      label: 'Roma Norte',
      alcaldia: 'Cuauhtémoc',
      country_code: 'MX',
    });
    expect(prompt).toContain('Roma Norte');
    expect(prompt).toContain('Cuauhtémoc');
    expect(prompt).toContain('JSON');
  });

  it('buildUserPrompt falls back to CDMX when alcaldia missing', () => {
    const prompt = buildUserPrompt({
      zone_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      label: 'Roma Norte',
      alcaldia: null,
      country_code: 'MX',
    });
    expect(prompt).toContain('Ciudad de México');
  });

  it('assembleContentMd produces h1 title + 8 h2 sections in order', () => {
    const md = assembleContentMd(sectionsFixture, 'Roma Norte');
    expect(md.startsWith('# Roma Norte')).toBe(true);
    expect(md).toContain('## Introducción');
    expect(md).toContain('## Mercado inmobiliario');
    const headings = md.match(/^## /gm) ?? [];
    expect(headings.length).toBe(8);
  });

  it('sectionsToJsonb preserves all keys with heading + content_md', () => {
    const jsonb = sectionsToJsonb(sectionsFixture);
    expect(Object.keys(jsonb).length).toBe(8);
    expect(jsonb.intro?.heading).toBe('Introducción');
    expect(jsonb.intro?.content_md).toBe(sectionsFixture.intro);
  });
});
