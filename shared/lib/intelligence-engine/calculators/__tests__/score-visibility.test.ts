import { describe, expect, it } from 'vitest';
import { filterForPublic, isPublicField, type VisibilityRule } from '../score-visibility';

const internalRule: VisibilityRule = {
  score_id: 'E01',
  visibility: 'internal',
  allowed_fields: [],
  excluded_fields: ['components.internal_margin'],
  tenant_scope_required: true,
};

const publicWhitelistRule: VisibilityRule = {
  score_id: 'G01',
  visibility: 'public',
  allowed_fields: ['score_value', 'score_label', 'confidence', 'components.public_summary'],
  excluded_fields: [],
  tenant_scope_required: false,
};

const publicExcludeRule: VisibilityRule = {
  score_id: 'D02',
  visibility: 'public',
  allowed_fields: [],
  excluded_fields: ['components.raw_signals', 'provenance'],
  tenant_scope_required: false,
};

describe('isPublicField', () => {
  it('retorna true si no hay rule (backward compat)', () => {
    expect(isPublicField(null, 'anything')).toBe(true);
  });

  it('internal rule → todos los campos bloqueados', () => {
    expect(isPublicField(internalRule, 'score_value')).toBe(false);
    expect(isPublicField(internalRule, 'components.anything')).toBe(false);
  });

  it('public whitelist → solo allowed_fields pasan', () => {
    expect(isPublicField(publicWhitelistRule, 'score_value')).toBe(true);
    expect(isPublicField(publicWhitelistRule, 'components.public_summary')).toBe(true);
    expect(isPublicField(publicWhitelistRule, 'components.public_summary.nested')).toBe(true);
    expect(isPublicField(publicWhitelistRule, 'components.internal_margin')).toBe(false);
  });

  it('public sin whitelist → todos excepto excluded', () => {
    expect(isPublicField(publicExcludeRule, 'score_value')).toBe(true);
    expect(isPublicField(publicExcludeRule, 'components.raw_signals')).toBe(false);
    expect(isPublicField(publicExcludeRule, 'provenance')).toBe(false);
    expect(isPublicField(publicExcludeRule, 'provenance.sources')).toBe(false);
  });
});

describe('filterForPublic', () => {
  it('internal rule → retorna null (row invisible)', () => {
    const row = { score_type: 'E01', score_value: 85, components: { internal_margin: 0.2 } };
    expect(filterForPublic(row, internalRule)).toBeNull();
  });

  it('public whitelist → preserva solo allowed paths', () => {
    const row = {
      score_type: 'G01',
      score_value: 85,
      score_label: 'bueno',
      confidence: 'high',
      country_code: 'MX',
      zone_id: 'zone-1',
      period_date: '2026-04-20',
      components: {
        public_summary: { rating: 85 },
        internal_margin: 0.2,
        secret: 'xyz',
      },
      provenance: { sources: [{ name: 'internal' }] },
    };
    const filtered = filterForPublic(row, publicWhitelistRule);
    expect(filtered).not.toBeNull();
    const f = filtered as Record<string, unknown>;
    expect(f.score_value).toBe(85);
    expect(f.score_label).toBe('bueno');
    expect((f.components as Record<string, unknown>).public_summary).toEqual({ rating: 85 });
    expect((f.components as Record<string, unknown>).internal_margin).toBeUndefined();
    expect((f.components as Record<string, unknown>).secret).toBeUndefined();
    expect(f.provenance).toBeUndefined();
  });

  it('public sin whitelist → remueve solo excluded top-level', () => {
    const row = {
      score_type: 'D02',
      score_value: 75,
      components: { raw_signals: [1, 2], rank: 5 },
      provenance: { sources: [] },
    };
    const filtered = filterForPublic(row, publicExcludeRule);
    expect(filtered).not.toBeNull();
    const f = filtered as Record<string, unknown>;
    expect(f.score_value).toBe(75);
    expect(f.components).toBeDefined();
    expect(f.provenance).toBeUndefined();
  });

  it('null rule → spread intacto', () => {
    const row = { score_type: 'FOO', score_value: 50 };
    const filtered = filterForPublic(row, null);
    expect(filtered).toEqual(row);
  });
});
