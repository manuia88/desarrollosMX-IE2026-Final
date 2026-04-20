import { describe, expect, it } from 'vitest';
import { resolveReasoning } from '../score-transparency-panel';

describe('resolveReasoning', () => {
  it('retorna null si template vacío', () => {
    expect(resolveReasoning(undefined, undefined, {})).toBeNull();
  });

  it('reemplaza placeholders desde template_vars', () => {
    const template = 'Safety de {zona_name} obtiene {score_value}';
    const result = resolveReasoning(template, { zona_name: 'Del Valle' }, { score_value: 82 });
    expect(result).toBe('Safety de Del Valle obtiene 82');
  });

  it('extra vars sobrescriben template_vars', () => {
    const result = resolveReasoning('{a}', { a: 'viejo' }, { a: 'nuevo' });
    expect(result).toBe('nuevo');
  });

  it('deja placeholder literal si no resuelve', () => {
    const result = resolveReasoning('Missing {foo} here', {}, {});
    expect(result).toBe('Missing {foo} here');
  });

  it('soporta valores numéricos y strings mixtos', () => {
    const result = resolveReasoning(
      '{name}: {value} (conf {confidence})',
      { name: 'F01', value: 75 },
      { confidence: 'medium' },
    );
    expect(result).toBe('F01: 75 (conf medium)');
  });
});
