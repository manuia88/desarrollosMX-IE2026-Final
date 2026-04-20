// F2 — Admin endpoint POST replay cascade con dry_run support.
// Protegido por is_superadmin() (ADR-009 §D2). Audit log inline.

import { NextResponse } from 'next/server';
import { executeReplay, ReplayInputSchema } from '@/shared/lib/intelligence-engine/cascades/replay';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: isSuper, error: rpcError } = await supabase.rpc('is_superadmin');
  if (rpcError || !isSuper) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = ReplayInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const triggeredBy = userData.user?.id ?? null;

  const admin = createAdminClient();
  const result = await executeReplay(admin, parsed.data, triggeredBy);
  return NextResponse.json(result);
}
