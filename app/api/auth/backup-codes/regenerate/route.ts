import { NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('mfa_regenerate_backup_codes');

  if (error) {
    return NextResponse.json(
      { error: 'regenerate_failed', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, codes: data ?? [] });
}
