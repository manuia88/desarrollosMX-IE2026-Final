import { describe, expect, it } from 'vitest';
import { type CalendarEvent, computeDynamicPricing } from '../lib/pricing/dynamic-advisor';

describe('computeDynamicPricing', () => {
  it('genera entries por cada día de forecast', () => {
    const result = computeDynamicPricing({
      base_adr_minor: 1_000_00,
      base_occupancy_rate: 0.6,
      currency: 'MXN',
      start_date: '2026-05-01',
      forecast_days: 90,
      events: [],
      today_iso: '2026-05-01',
    });
    expect(result.entries).toHaveLength(90);
    expect(result.entries[0]?.date).toBe('2026-05-01');
    expect(result.entries[89]?.date).toBe('2026-07-29');
  });

  it('Sábado tiene precio mayor que Lunes', () => {
    const result = computeDynamicPricing({
      base_adr_minor: 1_000_00,
      base_occupancy_rate: 0.6,
      currency: 'MXN',
      start_date: '2026-05-04', // Lunes
      forecast_days: 7,
      events: [],
      today_iso: '2026-05-04',
    });
    const monday = result.entries[0];
    const saturday = result.entries[5];
    if (!monday || !saturday) throw new Error('expected entries');
    expect(saturday.suggested_price_minor).toBeGreaterThan(monday.suggested_price_minor);
  });

  it('Eventos boostean precio el día del evento', () => {
    const event: CalendarEvent = {
      date_from: '2026-05-15',
      date_to: '2026-05-15',
      event_name: 'Test Festival',
      impact_multiplier: 2.0,
    };
    const result = computeDynamicPricing({
      base_adr_minor: 1_000_00,
      base_occupancy_rate: 0.6,
      currency: 'MXN',
      start_date: '2026-05-10',
      forecast_days: 21,
      events: [event],
      today_iso: '2026-05-10',
    });
    const eventDay = result.entries.find((e) => e.date === '2026-05-15');
    const otherDay = result.entries.find((e) => e.date === '2026-05-25');
    if (!eventDay || !otherDay) throw new Error('expected entries');
    expect(eventDay.suggested_price_minor).toBeGreaterThan(otherDay.suggested_price_minor);
    expect(eventDay.rationale.event_names).toContain('Test Festival');
    expect(eventDay.rationale.event_multiplier).toBeCloseTo(2, 2);
  });

  it('Decay cerca del evento (±7d) aplica fracción del multiplier', () => {
    const event: CalendarEvent = {
      date_from: '2026-05-15',
      date_to: '2026-05-15',
      event_name: 'Big Event',
      impact_multiplier: 2.0,
    };
    const result = computeDynamicPricing({
      base_adr_minor: 1_000_00,
      base_occupancy_rate: 0.6,
      currency: 'MXN',
      start_date: '2026-05-10',
      forecast_days: 14,
      events: [event],
      today_iso: '2026-05-10',
    });
    const day13 = result.entries.find((e) => e.date === '2026-05-13'); // 2d antes
    const day20 = result.entries.find((e) => e.date === '2026-05-20'); // 5d después
    if (!day13 || !day20) throw new Error('expected entries');
    expect(day13.rationale.event_multiplier).toBeGreaterThan(1);
    expect(day13.rationale.event_multiplier).toBeLessThan(2);
    expect(day20.rationale.event_multiplier).toBeGreaterThan(1);
  });

  it('lead time bumps: día +5 → +10%, día +20 → +5%, día +60 → 1.0x', () => {
    const result = computeDynamicPricing({
      base_adr_minor: 1_000_00,
      base_occupancy_rate: 0.6,
      currency: 'MXN',
      start_date: '2026-05-01',
      forecast_days: 90,
      events: [],
      today_iso: '2026-05-01',
    });
    const day5 = result.entries[5];
    const day20 = result.entries[20];
    const day60 = result.entries[60];
    if (!day5 || !day20 || !day60) throw new Error('expected entries');
    expect(day5.rationale.lead_time_multiplier).toBeCloseTo(1.1, 2);
    expect(day20.rationale.lead_time_multiplier).toBeCloseTo(1.05, 2);
    expect(day60.rationale.lead_time_multiplier).toBeCloseTo(1.0, 2);
  });

  it('confidence decae con horizonte', () => {
    const result = computeDynamicPricing({
      base_adr_minor: 1_000_00,
      base_occupancy_rate: 0.6,
      currency: 'MXN',
      start_date: '2026-05-01',
      forecast_days: 90,
      events: [],
      today_iso: '2026-05-01',
    });
    const day0 = result.entries[0];
    const day89 = result.entries[89];
    if (!day0 || !day89) throw new Error('expected entries');
    expect(day0.confidence).toBeGreaterThan(day89.confidence);
  });

  it('eventos se acumulan multiplicativamente', () => {
    const events: CalendarEvent[] = [
      {
        date_from: '2026-05-15',
        date_to: '2026-05-15',
        event_name: 'Event A',
        impact_multiplier: 1.5,
      },
      {
        date_from: '2026-05-15',
        date_to: '2026-05-15',
        event_name: 'Event B',
        impact_multiplier: 1.4,
      },
    ];
    const result = computeDynamicPricing({
      base_adr_minor: 1_000_00,
      base_occupancy_rate: 0.6,
      currency: 'MXN',
      start_date: '2026-05-15',
      forecast_days: 1,
      events,
      today_iso: '2026-05-15',
    });
    const entry = result.entries[0];
    if (!entry) throw new Error('expected entry');
    expect(entry.rationale.event_multiplier).toBeCloseTo(1.5 * 1.4, 2);
    expect(entry.rationale.event_names).toEqual(['Event A', 'Event B']);
  });
});
