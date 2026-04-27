-- F14.C M08 Marketing — landing_analytics (partitioned monthly + 12m retention)
-- Analytics events per landing: page_view / click_cta / lead_submit. UTM params + referer + ip_hash (privacy).
-- pg_partman v5 monthly. Cero SECDEF nuevas.

create table if not exists public.landing_analytics (
  id uuid not null default gen_random_uuid(),
  landing_id uuid not null,
  event_type text not null check (
    event_type in ('page_view', 'click_cta', 'lead_submit')
  ),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referer text,
  user_agent text,
  ip_hash text,
  country_code char(2),
  created_at timestamptz not null default now(),

  primary key (id, created_at)
) partition by range (created_at);

-- NOTA FK landing_id: NO declarable en partitioned parent (lock contention CASCADE).
-- Integridad: trigger BEFORE INSERT verificación + cleanup nightly.
-- Pattern idéntico a behavioral_signals.buyer_twin_id sin FK.

comment on table public.landing_analytics is
  'F14.C M08 — Analytics events landings (partitioned monthly pg_partman). 12m retention auto-drop. ip_hash sha256 (privacy LFPDPPP).';

create index if not exists idx_landing_analytics_landing_time
  on public.landing_analytics (landing_id, created_at desc);
create index if not exists idx_landing_analytics_event_time
  on public.landing_analytics (event_type, created_at desc);

select public.create_parent(
  p_parent_table := 'public.landing_analytics',
  p_control      := 'created_at',
  p_interval     := '1 month'
);

update public.part_config
   set retention            = '12 months',
       retention_keep_table = false,
       retention_keep_index = false
 where parent_table = 'public.landing_analytics';

alter table public.landing_analytics enable row level security;

drop policy if exists landing_analytics_select_owner on public.landing_analytics;
create policy landing_analytics_select_owner on public.landing_analytics
  for select to authenticated
  using (
    landing_id in (
      select id from public.landings where user_id = auth.uid()
    )
  );
comment on policy landing_analytics_select_owner on public.landing_analytics is
  'RATIONALE: asesor ve analytics de sus landings via JOIN landings.user_id.';

drop policy if exists landing_analytics_select_admin on public.landing_analytics;
create policy landing_analytics_select_admin on public.landing_analytics
  for select to authenticated
  using (public.rls_is_admin());
comment on policy landing_analytics_select_admin on public.landing_analytics is
  'RATIONALE: superadmin override análisis cross-asesor + auditoría.';

drop policy if exists landing_analytics_insert_anon on public.landing_analytics;
create policy landing_analytics_insert_anon on public.landing_analytics
  for insert to anon, authenticated
  with check (
    landing_id in (
      select id from public.landings where is_published = true
    )
  );
comment on policy landing_analytics_insert_anon on public.landing_analytics is
  'intentional_public — visitor anon puede registrar event (page_view/click_cta/lead_submit) en landings publicados. RATIONALE: tracking público es feature core; publication gating se hace en landings.is_published=true filter.';

grant select, insert on public.landing_analytics to authenticated;
grant insert on public.landing_analytics to anon;
