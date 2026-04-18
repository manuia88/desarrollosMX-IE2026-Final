import { NextResponse } from 'next/server';
import { createClient } from '@/shared/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { confirm?: string } = {};
  try {
    body = (await request.json()) as { confirm?: string };
  } catch {
    body = {};
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'confirmation_required', hint: 'send { "confirm": "DELETE" }' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc('request_account_deletion');

  if (error) {
    return NextResponse.json({ error: 'request_failed', message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    scheduled_anonymization_at: data,
    cancel_endpoint: '/api/privacy/data-delete/cancel',
  });
}
