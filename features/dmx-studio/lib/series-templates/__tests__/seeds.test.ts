import { describe, expect, it } from 'vitest';
import { TEMPLATE_SLUGS_CANON } from '../seeds';

describe('series-templates seeds F14.F.9 Tarea 8.4', () => {
  it('exporta los 4 slugs canon', () => {
    expect(TEMPLATE_SLUGS_CANON).toEqual([
      'residencial-clasico',
      'residencial-premium',
      'comercial-oficinas',
      'mixto-residencial-comercial',
    ]);
  });

  it('canon no muta entre llamadas', () => {
    const a = TEMPLATE_SLUGS_CANON.length;
    const b = TEMPLATE_SLUGS_CANON.length;
    expect(a).toBe(b);
    expect(a).toBe(4);
  });
});
