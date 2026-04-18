import { NextResponse } from 'next/server';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { error: signOutError } = await admin.auth.admin.signOut(user.id, 'global');
  if (signOutError) {
    return NextResponse.json(
      { error: 'sign_out_failed', message: signOutError.message },
      { status: 500 },
    );
  }

  await admin.from('auth_sessions_log').insert({
    profile_id: user.id,
    action: 'revoke',
    meta: { source: 'sign-out-all', scope: 'global' },
  });

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
