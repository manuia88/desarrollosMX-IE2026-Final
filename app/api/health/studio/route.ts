// FASE 14.F.0 — DMX Studio pre-flight health endpoint.
// DMX Studio dentro DMX único entorno (ADR-054). Verifica presencia env vars
// requeridas para 9 wrappers AI (Kling, ElevenLabs, Claude, Stripe, Sandbox).
//
// Verify-before-spend canon: NO consume credits APIs externas. Solo presence env.
// Auth: role admin_desarrolladora o superadmin (mismo gate que /api/admin/*).
// NOTA Next.js 16 cacheComponents: NO export const dynamic/runtime aquí.

import { NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

const REQUIRED_ENV_VARS = [
  'REPLICATE_API_TOKEN',
  'ELEVENLABS_API_KEY',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BANXICO_TOKEN',
] as const;

type EnvVarName = (typeof REQUIRED_ENV_VARS)[number];

const ALLOWED_ROLES = new Set(['admin_desarrolladora', 'superadmin', 'mb_admin']);

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', userData.user.id)
    .single();

  if (profileErr || !profile?.rol || !ALLOWED_ROLES.has(profile.rol)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const presenceMap: Record<EnvVarName, boolean> = {} as Record<EnvVarName, boolean>;
  const missingVars: EnvVarName[] = [];

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    const present = typeof value === 'string' && value.length > 0;
    presenceMap[varName] = present;
    if (!present) missingVars.push(varName);
  }

  const presentCount = REQUIRED_ENV_VARS.length - missingVars.length;
  const ok = missingVars.length === 0;

  return NextResponse.json(
    {
      ok,
      missing_vars: missingVars,
      present_count: presentCount,
      total_count: REQUIRED_ENV_VARS.length,
      presence: presenceMap,
      checked_at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
