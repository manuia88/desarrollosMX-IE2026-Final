// Tests for denue-alpha-classifier.ts — BLOQUE 11.H Trend Genome sub-agent A (11.H.2).

import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import type { ClassifyDenueParams } from '../denue-alpha-classifier';
import { classifyDenueAperturas } from '../denue-alpha-classifier';

const PERIOD = '2026-04-01';

function baseParams(overrides: Partial<ClassifyDenueParams> = {}): ClassifyDenueParams {
  return {
    zoneId: 'col-roma-norte',
    scopeType: 'colonia',
    countryCode: 'MX',
    period: PERIOD,
    supabase: {} as SupabaseClient,
    ...overrides,
  };
}

// Build a chainable mock that resolves `.limit()` with the supplied payload.
function denueClientReturning(result: {
  data: readonly Record<string, unknown>[] | null;
  error: unknown;
}): SupabaseClient {
  const chain = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    gte() {
      return this;
    },
    lte() {
      return this;
    },
    limit() {
      return Promise.resolve(result);
    },
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

function denueClientError(): SupabaseClient {
  return denueClientReturning({
    data: null,
    error: { message: 'relation "denue_establishments" does not exist' },
  });
}

function denueClientRejecting(): SupabaseClient {
  const chain = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    gte() {
      return this;
    },
    lte() {
      return this;
    },
    limit() {
      return Promise.reject(new Error('relation "denue_establishments" does not exist'));
    },
  };
  return { from: () => chain } as unknown as SupabaseClient;
}

describe('classifyDenueAperturas', () => {
  it('table missing (rejecting from() chain) → DENUE_TABLE_NOT_FOUND', async () => {
    const supabase = denueClientRejecting();
    const res = await classifyDenueAperturas(baseParams({ supabase }));
    expect(res.limitation).toBe('DENUE_TABLE_NOT_FOUND');
    expect(res.total_alpha_openings_6m).toBe(0);
    expect(res.source_confidence).toBe(0);
  });

  it('table error (.error set) on every candidate → DENUE_TABLE_NOT_FOUND', async () => {
    const supabase = denueClientError();
    const res = await classifyDenueAperturas(baseParams({ supabase }));
    expect(res.limitation).toBe('DENUE_TABLE_NOT_FOUND');
    expect(res.total_alpha_openings_6m).toBe(0);
    expect(res.source_confidence).toBe(0);
  });

  it('2 specialty cafes + 1 gallery + 1 boutique → total 4, correct per-category', async () => {
    const rows = [
      {
        nombre_establecimiento: 'Café Especialidad La Roma',
        actividad_economica: 'Cafeterías',
        razon_social: '',
        fecha_alta: '2026-03-20',
      },
      {
        nombre_establecimiento: 'Slow Coffee Lab',
        actividad_economica: 'Cafetería de especialidad',
        razon_social: '',
        fecha_alta: '2026-03-15',
      },
      {
        nombre_establecimiento: 'Galería Contemporánea',
        actividad_economica: 'Galería de arte',
        razon_social: '',
        fecha_alta: '2026-02-10',
      },
      {
        nombre_establecimiento: 'Boutique Artesanal Mx',
        actividad_economica: 'Venta al por menor',
        razon_social: 'Boutique independiente SA',
        fecha_alta: '2026-01-05',
      },
      // Non-matching row (shouldn't count)
      {
        nombre_establecimiento: 'Farmacia Genérica',
        actividad_economica: 'Farmacia',
        razon_social: '',
        fecha_alta: '2026-03-25',
      },
    ];
    const supabase = denueClientReturning({ data: rows, error: null });
    const res = await classifyDenueAperturas(baseParams({ supabase }));

    expect(res.limitation).toBeNull();
    expect(res.total_alpha_openings_6m).toBe(4);
    expect(res.specialty_cafe_count).toBe(2);
    expect(res.gallery_count).toBe(1);
    expect(res.boutique_count).toBe(1);
    expect(res.source_confidence).toBeGreaterThan(0.7);
    expect(res.source_confidence).toBeLessThanOrEqual(1.0);
    expect(res.sample_names.length).toBe(4);
  });

  it('rows outside 6m window excluded (Supabase lte/gte filters handle this)', async () => {
    // Simulate a case where the DB has already filtered; only in-window rows
    // come back. Out-of-window rows simply never appear in result.data. This
    // test asserts that the classifier counts only what the DB returned.
    const rows = [
      {
        nombre_establecimiento: 'Galería Arte Nuevo',
        actividad_economica: 'Galería',
        razon_social: '',
        fecha_alta: '2026-03-01', // in-window
      },
    ];
    const supabase = denueClientReturning({ data: rows, error: null });
    const res = await classifyDenueAperturas(baseParams({ supabase }));
    expect(res.total_alpha_openings_6m).toBe(1);
    expect(res.gallery_count).toBe(1);
    // Sample names should only include the in-window row.
    expect(res.sample_names).toEqual(['Galería Arte Nuevo']);
  });

  it('empty result (table exists, zone empty) → limitation null, confidence 0.6', async () => {
    const supabase = denueClientReturning({ data: [], error: null });
    const res = await classifyDenueAperturas(baseParams({ supabase }));
    expect(res.limitation).toBeNull();
    expect(res.total_alpha_openings_6m).toBe(0);
    expect(res.source_confidence).toBe(0.6);
    expect(res.sample_names).toEqual([]);
  });

  it('sample_names returns up to 10 ordered by fecha_alta desc', async () => {
    // Build 12 matching rows with varying fecha_alta.
    const rows = Array.from({ length: 12 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return {
        nombre_establecimiento: `Galería ${String(i + 1).padStart(2, '0')}`,
        actividad_economica: 'Galería de arte',
        razon_social: '',
        fecha_alta: `2026-03-${day}`,
      };
    });
    const supabase = denueClientReturning({ data: rows, error: null });
    const res = await classifyDenueAperturas(baseParams({ supabase }));

    expect(res.total_alpha_openings_6m).toBe(12);
    expect(res.sample_names.length).toBe(10);
    // Ordered by fecha_alta desc: most recent first → "Galería 12" then 11, etc.
    expect(res.sample_names[0]).toBe('Galería 12');
    expect(res.sample_names[1]).toBe('Galería 11');
    expect(res.sample_names[9]).toBe('Galería 03');
  });
});
