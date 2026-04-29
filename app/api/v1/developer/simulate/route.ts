import { NextResponse } from 'next/server';
import { simulateProjectInput } from '@/features/developer-moonshots/schemas';
import { simulateProject } from '@/shared/lib/moonshots/simulator';
import { jsonError, withApiKey } from '../_shared';

export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  const auth = await withApiKey(request, 'simulate:write', 'simulate');
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('invalid JSON body', 400);
  }

  const parsed = simulateProjectInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data: profile } = await auth.auth.supabase
    .from('profiles')
    .select('desarrolladora_id')
    .eq('id', auth.auth.profileId)
    .maybeSingle();

  try {
    const result = await simulateProject(
      auth.auth.supabase,
      parsed.data,
      auth.auth.profileId,
      profile?.desarrolladora_id ?? null,
    );
    return NextResponse.json(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'simulation_failed', 500);
  }
}
