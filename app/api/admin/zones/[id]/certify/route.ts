// L-32 FASE 10 SESIÓN 3/3 — admin endpoint superadmin para evaluar si una zona
// califica para certificación DMX Zone Certified.
// GET /api/admin/zones/[id]/certify?country=MX → CertificationEvaluation.
// Protegido por is_superadmin(). Sin automatic award H1 — admin decide manual.

import { NextResponse } from 'next/server';
import { getZoneCertificationStatus } from '@/shared/lib/intelligence-engine/certifications/zone-certified';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: isSuper, error: authError } = await supabase.rpc('is_superadmin');
  if (authError || !isSuper) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const params = await context.params;
  const zoneId = params.id;
  const url = new URL(request.url);
  const countryCode = url.searchParams.get('country') ?? 'MX';

  if (!/^[0-9a-fA-F-]{36}$/.test(zoneId)) {
    return NextResponse.json({ error: 'invalid_zone_id' }, { status: 400 });
  }

  const admin = createAdminClient();
  const evaluation = await getZoneCertificationStatus(admin, zoneId, countryCode);
  return NextResponse.json(evaluation, { status: 200 });
}
