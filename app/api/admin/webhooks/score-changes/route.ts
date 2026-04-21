// D21 FASE 10 — admin endpoint CRUD subscripciones score-change webhooks.
// GET    list all subscriptions (superadmin).
// POST   create new subscription. Auto-genera hmac_secret si omit.
// DELETE remove by subscription_name.
// Protegido por is_superadmin().
//
// Consumer externo (worker score-change-webhook-worker) wire en sesión 2/3.
// Aquí solo gestionamos la tabla score_change_webhooks + score_change_deliveries.

import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { createClient } from '@/shared/lib/supabase/server';

const WebhookCreateSchema = z.object({
  subscription_name: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9_-]+$/),
  url: z.string().url().startsWith('https://'),
  hmac_secret: z.string().min(32).optional(),
  score_ids: z.array(z.string().regex(/^[A-Z][A-Z0-9]{1,4}$/)).default([]),
  entity_types: z.array(z.enum(['zone', 'project', 'user'])).default(['zone']),
  country_codes: z
    .array(
      z
        .string()
        .length(2)
        .regex(/^[A-Z]{2}$/),
    )
    .default(['MX']),
  min_delta_pct: z.number().min(0).max(100).default(10),
  enabled: z.boolean().default(true),
});

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: isSuper, error } = await supabase.rpc('is_superadmin');
  if (error || !isSuper) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireSuperadmin();
  if (denied) return denied;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('score_change_webhooks')
    .select(
      'id, subscription_name, url, score_ids, entity_types, country_codes, min_delta_pct, enabled, created_at, updated_at, last_delivery_at, last_delivery_status',
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'list_failed', detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, subscriptions: data ?? [] });
}

export async function POST(request: Request) {
  const denied = await requireSuperadmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = WebhookCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const hmac_secret = parsed.data.hmac_secret ?? randomBytes(32).toString('hex');

  const insertRow = {
    subscription_name: parsed.data.subscription_name,
    url: parsed.data.url,
    hmac_secret,
    score_ids: parsed.data.score_ids,
    entity_types: parsed.data.entity_types,
    country_codes: parsed.data.country_codes,
    min_delta_pct: parsed.data.min_delta_pct,
    enabled: parsed.data.enabled,
    created_by: user?.id ?? null,
  };

  const { data, error } = await admin
    .from('score_change_webhooks')
    .insert(insertRow)
    .select('id, subscription_name, url, min_delta_pct, enabled, created_at')
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'create_failed', detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    subscription: data,
    hmac_secret_preview: `${hmac_secret.slice(0, 8)}...`,
  });
}

export async function DELETE(request: Request) {
  const denied = await requireSuperadmin();
  if (denied) return denied;

  const url = new URL(request.url);
  const name = url.searchParams.get('subscription_name');
  if (!name) {
    return NextResponse.json({ error: 'subscription_name query param required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('score_change_webhooks')
    .delete()
    .eq('subscription_name', name);

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'delete_failed', detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, deleted: name });
}
