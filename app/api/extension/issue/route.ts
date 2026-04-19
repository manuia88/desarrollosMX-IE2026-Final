import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/shared/lib/supabase/server';

const inputSchema = z.object({
  label: z.string().min(1).max(120).default('Chrome Extension'),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    if (request.headers.get('content-length') !== '0') {
      body = await request.json();
    }
  } catch {
    body = {};
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('issue_extension_token', {
    p_label: parsed.data.label,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.raw_key) {
    return NextResponse.json({ error: 'no_token_returned' }, { status: 500 });
  }
  return NextResponse.json({
    api_key_id: row.api_key_id,
    raw_key: row.raw_key,
  });
}
