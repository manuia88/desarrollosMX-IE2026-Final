// Edge Function: on-auth-event
// Registra eventos de Supabase Auth (login/logout/refresh/revoke) en
// auth_sessions_log. Se dispara desde Auth Hooks (Send Email Hook /
// Password Verification Hook no aplican) → en producción se conecta a un
// Database Webhook sobre auth.audit_log_entries o a un Auth Hook custom que
// invoque este endpoint.
//
// Payload esperado:
//   { profile_id: uuid, action: 'login'|'logout'|'refresh'|'revoke',
//     ip?: string, user_agent?: string, aal?: 'aal1'|'aal2', meta?: object }

import { createClient } from 'jsr:@supabase/supabase-js@2';

type AuthEventPayload = {
  profile_id: string;
  action: 'login' | 'logout' | 'refresh' | 'revoke';
  ip?: string;
  user_agent?: string;
  aal?: string;
  meta?: Record<string, unknown>;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const hookSecret = Deno.env.get('AUTH_EVENT_HOOK_SECRET');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(supabaseUrl ?? '', serviceRoleKey ?? '', {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (hookSecret) {
    const provided = req.headers.get('x-hook-secret');
    if (provided !== hookSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  let payload: AuthEventPayload;
  try {
    payload = (await req.json()) as AuthEventPayload;
  } catch (_err) {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!payload.profile_id || !['login', 'logout', 'refresh', 'revoke'].includes(payload.action)) {
    return new Response(JSON.stringify({ error: 'invalid_payload' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { error } = await admin.from('auth_sessions_log').insert({
    profile_id: payload.profile_id,
    action: payload.action,
    ip: payload.ip ?? null,
    user_agent: payload.user_agent ?? null,
    aal: payload.aal ?? null,
    meta: payload.meta ?? {},
  });

  if (error) {
    console.error('auth_sessions_log insert failed', error);
    return new Response(JSON.stringify({ error: 'insert_failed', message: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
});
