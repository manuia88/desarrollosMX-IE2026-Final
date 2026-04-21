// FASE 11.J.11 — A/B testing subject lines.
//
// Estrategia: split determinístico 50/50 por hash(subscriberId) % 2 durante
// la primera `sample_size` ventana (default 1000). Después de ese corte, el
// winner (mayor open_rate) se envía a 100% de los subscribers.
//
// Open rate se calcula desde newsletter_deliveries WHERE status IN
// ('opened','clicked') — ambos implican que el email fue abierto.

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import type { NewsletterAbTestRow, NewsletterTemplate } from '../types';
import { asRaw } from './raw-supabase';

type Supabase = SupabaseClient<Database>;

export interface SelectSubjectVariantOpts {
  readonly template: NewsletterTemplate;
  readonly periodDate: string;
  readonly subscriberId: string;
  readonly supabase?: Supabase;
}

export interface SelectedVariant {
  readonly subject: string;
  readonly variant: 'A' | 'B';
  readonly abTestId: string | null;
}

function hashModulo(input: string, mod: number): number {
  const h = createHash('sha256').update(input).digest();
  // Tomamos primeros 4 bytes como uint32 y aplicamos mod.
  const n = ((h[0] ?? 0) << 24) | ((h[1] ?? 0) << 16) | ((h[2] ?? 0) << 8) | (h[3] ?? 0);
  return Math.abs(n) % mod;
}

async function countDeliveriesForTest(supabase: Supabase, abTestId: string): Promise<number> {
  const { count } = await asRaw(supabase)
    .from('newsletter_deliveries')
    .select('id', { count: 'exact', head: true })
    .eq('ab_test_id', abTestId);
  return typeof count === 'number' ? count : 0;
}

export async function selectSubjectVariant(
  opts: SelectSubjectVariantOpts,
): Promise<SelectedVariant> {
  const supabase = opts.supabase ?? createAdminClient();
  const { data: testData } = await asRaw(supabase)
    .from('newsletter_ab_tests')
    .select('*')
    .eq('template', opts.template)
    .eq('period_date', opts.periodDate)
    .maybeSingle<NewsletterAbTestRow>();

  const test = testData;
  if (!test) {
    // Sin experiment activo → fallback a subject default (caller lo maneja).
    return { subject: '', variant: 'A', abTestId: null };
  }

  // Post-winner: si ya se calculó winner, todos reciben el ganador.
  if (test.winner_variant) {
    const winnerSubject =
      test.winner_variant === 'A' ? test.variant_a_subject : test.variant_b_subject;
    return { subject: winnerSubject, variant: test.winner_variant, abTestId: test.id };
  }

  // Split 50/50 determinístico por hash(subscriberId).
  const sentSoFar = await countDeliveriesForTest(supabase, test.id);
  const inSampleWindow = sentSoFar < test.sample_size;

  if (inSampleWindow) {
    const bucket = hashModulo(opts.subscriberId, 2);
    const variant: 'A' | 'B' = bucket === 0 ? 'A' : 'B';
    const subject = variant === 'A' ? test.variant_a_subject : test.variant_b_subject;
    return { subject, variant, abTestId: test.id };
  }

  // Sample cerrado pero winner no calculado aún: default variant A (producción
  // debería haber triggered computeWinner, pero defensivo).
  return {
    subject: test.variant_a_subject,
    variant: 'A',
    abTestId: test.id,
  };
}

// ---------- Winner compute ----------

export interface ComputeWinnerOpts {
  readonly abTestId: string;
  readonly supabase?: Supabase;
}

export interface ComputeWinnerResult {
  readonly winner: 'A' | 'B' | null;
  readonly openRateA: number;
  readonly openRateB: number;
  readonly sampleA: number;
  readonly sampleB: number;
}

interface DeliveryCountRow {
  readonly subject_variant: string | null;
  readonly status: string;
}

export async function computeWinner(opts: ComputeWinnerOpts): Promise<ComputeWinnerResult> {
  const supabase = opts.supabase ?? createAdminClient();
  const raw = asRaw(supabase);

  const { data } = await raw
    .from('newsletter_deliveries')
    .select('subject_variant,status')
    .eq('ab_test_id', opts.abTestId);

  const rows = (data ?? []) as ReadonlyArray<DeliveryCountRow>;
  let sentA = 0;
  let sentB = 0;
  let openA = 0;
  let openB = 0;
  for (const r of rows) {
    const v = r.subject_variant;
    const opened = r.status === 'opened' || r.status === 'clicked';
    if (v === 'A') {
      sentA += 1;
      if (opened) openA += 1;
    } else if (v === 'B') {
      sentB += 1;
      if (opened) openB += 1;
    }
  }

  const rateA = sentA > 0 ? openA / sentA : 0;
  const rateB = sentB > 0 ? openB / sentB : 0;

  // Winner requires sample_size minimum on both sides (evita falsos positivos
  // con <50 sends).
  const minSamplePerSide = 50;
  let winner: 'A' | 'B' | null = null;
  if (sentA >= minSamplePerSide && sentB >= minSamplePerSide) {
    if (rateA > rateB) winner = 'A';
    else if (rateB > rateA) winner = 'B';
  }

  await raw
    .from('newsletter_ab_tests')
    .update({
      variant_a_open_rate: Number(rateA.toFixed(4)),
      variant_b_open_rate: Number(rateB.toFixed(4)),
      winner_variant: winner,
      computed_at: new Date().toISOString(),
    })
    .eq('id', opts.abTestId);

  return {
    winner,
    openRateA: rateA,
    openRateB: rateB,
    sampleA: sentA,
    sampleB: sentB,
  };
}
