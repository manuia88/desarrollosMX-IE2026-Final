// Admin endpoint — snapshot del estado del worker IE.
// FASE 08 / BLOQUE 8.A / MÓDULO 8.A.4.6
// Protegido por is_superadmin() (ADR-009 §D2). Consumido por el portal admin FASE 19.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: isSuper, error: rpcError } = await supabase.rpc('is_superadmin');

  if (rpcError || !isSuper) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Lectura privilegiada vía service-role (bypass RLS del queue).
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('queue_metrics_summary');
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, summary: data });
}
