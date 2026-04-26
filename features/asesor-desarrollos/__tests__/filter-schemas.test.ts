import { describe, expect, it } from 'vitest';
import {
  filtersSchema,
  PANE_KEYS,
  paneEnum,
  SORT_KEYS,
  sortEnum,
  TAB_KEYS,
  tabEnum,
  tipoEnum,
} from '../lib/filter-schemas';

describe('filter-schemas', () => {
  describe('tabEnum', () => {
    it('accepts canonical 4 tabs', () => {
      for (const tab of TAB_KEYS) {
        expect(tabEnum.parse(tab)).toBe(tab);
      }
    });

    it('rejects unknown tab', () => {
      expect(() => tabEnum.parse('foo')).toThrow();
    });
  });

  describe('sortEnum', () => {
    it('accepts canonical 4 sorts', () => {
      for (const sort of SORT_KEYS) {
        expect(sortEnum.parse(sort)).toBe(sort);
      }
    });
  });

  describe('paneEnum', () => {
    it('accepts canonical 6 panes', () => {
      for (const pane of PANE_KEYS) {
        expect(paneEnum.parse(pane)).toBe(pane);
      }
    });
  });

  describe('tipoEnum', () => {
    it('accepts 5 property types', () => {
      expect(tipoEnum.parse('departamento')).toBe('departamento');
      expect(tipoEnum.parse('casa')).toBe('casa');
      expect(tipoEnum.parse('terreno')).toBe('terreno');
      expect(tipoEnum.parse('oficina')).toBe('oficina');
      expect(tipoEnum.parse('local')).toBe('local');
    });
  });

  describe('filtersSchema', () => {
    it('applies defaults for tab/sort/pane', () => {
      const parsed = filtersSchema.parse({});
      expect(parsed.tab).toBe('own');
      expect(parsed.sort).toBe('byScore');
      expect(parsed.pane).toBe('overview');
    });

    it('coerces priceMin/priceMax to number from string', () => {
      const parsed = filtersSchema.parse({ priceMin: '1000', priceMax: '5000' });
      expect(parsed.priceMin).toBe(1000);
      expect(parsed.priceMax).toBe(5000);
    });

    it('rejects negative priceMin', () => {
      expect(() => filtersSchema.parse({ priceMin: '-100' })).toThrow();
    });

    it('rejects city longer than 80 chars', () => {
      expect(() => filtersSchema.parse({ city: 'a'.repeat(81) })).toThrow();
    });

    it('accepts uuid drawer id', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const parsed = filtersSchema.parse({ drawer: id });
      expect(parsed.drawer).toBe(id);
    });

    it('rejects non-uuid drawer id', () => {
      expect(() => filtersSchema.parse({ drawer: 'not-uuid' })).toThrow();
    });
  });
});
