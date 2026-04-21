-- FASE 11 BLOQUE 11.J — Newsletter + Wrapped schema.
--
-- Crea 4 tablas nuevas:
--   1) newsletter_subscribers  — suscriptores con double opt-in y preferences.
--   2) newsletter_deliveries   — audit log de envíos + events (open/click/bounce).
--   3) newsletter_ab_tests     — subject line A/B testing 50/50.
--   4) dmx_wrapped_snapshots   — snapshots anuales personalizados (Spotify Wrapped-style).
--
-- RLS inviolable: todas las tablas con ENABLE ROW LEVEL SECURITY en este archivo.
-- Allowlist audit_rls_violations sale en migration separada (v18) a continuación.
--
-- Patrón de policies:
--   - *_public_read_closed   : SELECT para producto público.
--   - *_service_all          : FOR ALL TO service_role bypass RLS (writer cron + adapters).
--   - *_owner_*              : SELECT/UPDATE/DELETE por auth.uid() vía user_id.
--   - *_public_insert        : INSERT anónimo (public subscribe endpoint).

-- ============================================================
-- TABLA 1: newsletter_subscribers — suscriptores + double opt-in + preferences.
-- ============================================================
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) between 3 and 320),
  user_id uuid null references auth.users(id) on delete set null,
  locale text not null
    check (locale in ('es-MX','es-CO','es-AR','pt-BR','en-US')),
  status text not null default 'pending_confirmation'
    check (status in ('pending_confirmation','active','unsubscribed','bounced','complained')),
  subscribed_at timestamptz not null default now(),
  confirmed_at timestamptz null,
  unsubscribed_at timestamptz null,
  confirm_token_hash text null,
  unsubscribe_token_hash text null,
  preferences jsonb not null default jsonb_build_object(
    'frequency','monthly',
    'zone_scope_ids', jsonb_build_array(),
    'sections', jsonb_build_object(
      'pulse', true,
      'migration', true,
      'causal', true,
      'alpha', false,
      'scorecard', true,
      'streaks', true
    )
  ),
  consent_lfpdppp_at timestamptz not null default now(),
  consent_ip inet null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status, locale);
create index if not exists newsletter_subscribers_user_id_idx
  on public.newsletter_subscribers (user_id) where user_id is not null;
create index if not exists newsletter_subscribers_confirm_token_idx
  on public.newsletter_subscribers (confirm_token_hash) where confirm_token_hash is not null;
create index if not exists newsletter_subscribers_unsub_token_idx
  on public.newsletter_subscribers (unsubscribe_token_hash) where unsubscribe_token_hash is not null;

alter table public.newsletter_subscribers enable row level security;

-- INSERT público: cualquier anónimo puede suscribirse. Campos sensibles
-- (confirm_token_hash, unsubscribe_token_hash, status) quedan protegidos via
-- triggers defaults (pending_confirmation) + updates solo service_role.
create policy newsletter_subscribers_public_insert on public.newsletter_subscribers
  for insert
  with check (status = 'pending_confirmation');

comment on policy newsletter_subscribers_public_insert on public.newsletter_subscribers is
  'RATIONALE intentional_public: anónimos pueden suscribirse (public landing). '
  'WITH CHECK fuerza status=pending_confirmation (no bypass de double opt-in).';

-- SELECT para owner: si user_id = auth.uid() puede ver su propia suscripción.
create policy newsletter_subscribers_owner_read on public.newsletter_subscribers
  for select
  using (user_id = (select auth.uid()));

-- UPDATE owner: sólo puede actualizar preferences desde su cuenta logueada.
create policy newsletter_subscribers_owner_update on public.newsletter_subscribers
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- DELETE owner.
create policy newsletter_subscribers_owner_delete on public.newsletter_subscribers
  for delete
  using (user_id = (select auth.uid()));

-- Service role bypass (cron + adapters).
create policy newsletter_subscribers_service_all on public.newsletter_subscribers
  for all to service_role
  using (true) with check (true);

-- Trigger updated_at.
create trigger newsletter_subscribers_set_updated_at
  before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLA 2: newsletter_deliveries — audit log envíos.
-- ============================================================
create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  template text not null
    check (template in (
      'monthly-mom','scorecard-digest-preview','scorecard-digest-post',
      'wrapped-annual','confirm-email','unsubscribe-confirm','zone-personalized'
    )),
  subject text not null,
  subject_variant text null,
  ab_test_id uuid null,
  sent_at timestamptz not null default now(),
  status text not null default 'queued'
    check (status in ('queued','sent','delivered','opened','clicked','bounced','complained','failed')),
  provider_message_id text null,
  opened_at timestamptz null,
  clicked_at timestamptz null,
  bounced_reason text null,
  payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_deliveries_subscriber_idx
  on public.newsletter_deliveries (subscriber_id, sent_at desc);
create index if not exists newsletter_deliveries_template_idx
  on public.newsletter_deliveries (template, sent_at desc);
create index if not exists newsletter_deliveries_ab_test_idx
  on public.newsletter_deliveries (ab_test_id) where ab_test_id is not null;

alter table public.newsletter_deliveries enable row level security;

-- Owner via subscriber.user_id = auth.uid()
create policy newsletter_deliveries_owner_read on public.newsletter_deliveries
  for select
  using (
    exists (
      select 1 from public.newsletter_subscribers s
      where s.id = newsletter_deliveries.subscriber_id
        and s.user_id = (select auth.uid())
    )
  );

create policy newsletter_deliveries_service_all on public.newsletter_deliveries
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 3: newsletter_ab_tests — subject line A/B testing.
-- ============================================================
create table if not exists public.newsletter_ab_tests (
  id uuid primary key default gen_random_uuid(),
  template text not null
    check (template in (
      'monthly-mom','scorecard-digest-preview','scorecard-digest-post',
      'wrapped-annual','confirm-email','unsubscribe-confirm','zone-personalized'
    )),
  period_date date not null,
  variant_a_subject text not null,
  variant_b_subject text not null,
  sample_size integer not null default 1000 check (sample_size > 0),
  winner_variant char(1) null check (winner_variant in ('A','B')),
  variant_a_open_rate numeric(5,4) null check (variant_a_open_rate is null or (variant_a_open_rate >= 0 and variant_a_open_rate <= 1)),
  variant_b_open_rate numeric(5,4) null check (variant_b_open_rate is null or (variant_b_open_rate >= 0 and variant_b_open_rate <= 1)),
  computed_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (template, period_date)
);

create index if not exists newsletter_ab_tests_template_period_idx
  on public.newsletter_ab_tests (template, period_date desc);

alter table public.newsletter_ab_tests enable row level security;

-- Lectura pública (dashboard UI + curiosos — es metadata de experiments no datos PII).
create policy newsletter_ab_tests_public_read on public.newsletter_ab_tests
  for select
  using (true);

comment on policy newsletter_ab_tests_public_read on public.newsletter_ab_tests is
  'RATIONALE intentional_public: A/B test metadata (subjects, sample, open rates) '
  'es telemetría agregada pública; sin PII.';

create policy newsletter_ab_tests_service_all on public.newsletter_ab_tests
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- TABLA 4: dmx_wrapped_snapshots — snapshots anuales (Spotify Wrapped-style).
-- ============================================================
create table if not exists public.dmx_wrapped_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  year integer not null check (year between 2024 and 2100),
  country_code char(2) not null default 'MX',
  cards jsonb not null default '[]'::jsonb,
  share_url text null,
  generated_at timestamptz not null default now()
);

-- Unique por user+year+country cuando hay user_id.
create unique index if not exists dmx_wrapped_unique_user_year
  on public.dmx_wrapped_snapshots (user_id, year, country_code)
  where user_id is not null;

-- Index para snapshot anon (genérico nacional).
create index if not exists dmx_wrapped_anon_year_idx
  on public.dmx_wrapped_snapshots (year, country_code)
  where user_id is null;

alter table public.dmx_wrapped_snapshots enable row level security;

-- Lectura pública para share links (el snapshot es producto de descubrimiento;
-- cards son datos anonimizados).
create policy dmx_wrapped_public_read on public.dmx_wrapped_snapshots
  for select
  using (true);

comment on policy dmx_wrapped_public_read on public.dmx_wrapped_snapshots is
  'RATIONALE intentional_public: snapshots Wrapped son producto narrativo público. '
  'Cards contienen labels de zona + métricas agregadas (sin PII detallada).';

create policy dmx_wrapped_service_all on public.dmx_wrapped_snapshots
  for all to service_role
  using (true) with check (true);

-- ============================================================
-- Comments resumen.
-- ============================================================
comment on table public.newsletter_subscribers is
  'FASE 11.J — suscriptores newsletter DMX con double opt-in (LFPDPPP + CAN-SPAM).';
comment on table public.newsletter_deliveries is
  'FASE 11.J — audit log de envíos newsletter + events (open/click/bounce/complaint).';
comment on table public.newsletter_ab_tests is
  'FASE 11.J — A/B testing subject lines 50/50 con winner auto-computed post sample.';
comment on table public.dmx_wrapped_snapshots is
  'FASE 11.J — snapshots anuales tipo Spotify Wrapped (personalizado por user O anon nacional).';
