// D8 FASE 09 — admin endpoint superadmin para actualizar weights N1 runtime.
// POST body: { score_id, country_code, weights: Record<dimension, number> }.
// Valida sum(weights) ≈ 1.00 ±0.01. Invalida cache 1h en siguiente lookup.
// Protegido por is_superadmin().

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

const WeightsInputSchema = z.object({
  score_id: z
    .string()
    .min(1)
    .regex(/^[A-Z]\d{2}$/),
  country_code: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
  weights: z.record(z.string(), z.number().min(0).max(1)).refine(
    (w) => {
      const sum = Object.values(w).reduce((a, b) => a + b, 0);
      return Math.abs(sum - 1) < 0.01;
    },
    { message: 'weights sum must be ≈ 1.00 ±0.01' },
  ),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: isSuper, error: authError } = await supabase.rpc('is_superadmin');
  if (authError || !isSuper) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = WeightsInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { score_id, country_code, weights } = parsed.data;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: closeError } = await admin
    .from('score_weights')
    .update({ valid_until: now })
    .eq('score_id', score_id)
    .eq('country_code', country_code)
    .is('valid_until', null);
  if (closeError) {
    return NextResponse.json(
      { ok: false, error: 'close_current_weights_failed', detail: closeError.message },
      { status: 500 },
    );
  }

  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  const rows = Object.entries(weights).map(([dimension_score_id, weight]) => ({
    score_id,
    dimension_score_id,
    weight,
    country_code,
    valid_from: now,
    valid_until: null,
    created_by: user?.id ?? null,
  }));

  const { error: insertError } = await admin.from('score_weights').insert(rows);
  if (insertError) {
    return NextResponse.json(
      { ok: false, error: 'insert_weights_failed', detail: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    score_id,
    country_code,
    dimensions: rows.length,
    valid_from: now,
  });
}
