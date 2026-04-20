import { describe, expect, it } from 'vitest';
import {
  ieScoresGetByZoneInput,
  ieScoresGetDependenciesInput,
  ieScoresGetHistoryInput,
  ieScoresListInput,
} from '../schemas/scores';

const ZONE = '11111111-1111-4111-8111-111111111111'; // valid v4 UUID

describe('ie.scores.list input schema', () => {
  it('rechaza zone_id no UUID', () => {
    expect(() => ieScoresListInput.parse({ zone_id: 'not-uuid' })).toThrow();
  });

  it('default country_code=MX', () => {
    const r = ieScoresListInput.parse({ zone_id: ZONE });
    expect(r.country_code).toBe('MX');
  });

  it('score_codes acepta lista 1..32', () => {
    expect(() =>
      ieScoresListInput.parse({ zone_id: ZONE, score_codes: ['F01', 'F02', 'F08'] }),
    ).not.toThrow();
    expect(() => ieScoresListInput.parse({ zone_id: ZONE, score_codes: [] })).toThrow();
  });

  it('score_code regex uppercase alpha+num', () => {
    expect(() => ieScoresListInput.parse({ zone_id: ZONE, score_codes: ['f08'] })).toThrow();
    expect(() => ieScoresListInput.parse({ zone_id: ZONE, score_codes: ['F08'] })).not.toThrow();
    expect(() => ieScoresListInput.parse({ zone_id: ZONE, score_codes: ['N01'] })).not.toThrow();
  });
});

describe('ie.scores.getByZone input schema', () => {
  it('levels filter acepta 0..5', () => {
    expect(() => ieScoresGetByZoneInput.parse({ zone_id: ZONE, levels: [0, 1] })).not.toThrow();
    expect(() => ieScoresGetByZoneInput.parse({ zone_id: ZONE, levels: [6] })).toThrow();
  });
});

describe('ie.scores.getDependencies input schema', () => {
  it('requiere score_id válido', () => {
    expect(() => ieScoresGetDependenciesInput.parse({ score_id: 'F08' })).not.toThrow();
    expect(() => ieScoresGetDependenciesInput.parse({ score_id: 'f08' })).toThrow();
  });
});

describe('ie.scores.getHistory input schema', () => {
  it('requiere from/to ISO date', () => {
    expect(() =>
      ieScoresGetHistoryInput.parse({
        zone_id: ZONE,
        score_code: 'F08',
        from: '2026-01-01',
        to: '2026-04-01',
      }),
    ).not.toThrow();
    expect(() =>
      ieScoresGetHistoryInput.parse({
        zone_id: ZONE,
        score_code: 'F08',
        from: 'not-a-date',
        to: '2026-04-01',
      }),
    ).toThrow();
  });
});
