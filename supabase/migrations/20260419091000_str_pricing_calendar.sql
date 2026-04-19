-- FASE 07b / BLOQUE 7b.K — Dynamic Pricing Advisor.
-- Refs:
--   docs/02_PLAN_MAESTRO/FASE_07b_STR_INTELLIGENCE_COMPLETE.md §7b.K

create table public.str_events_calendar (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid,
  market_id uuid references public.str_markets(id) on delete cascade,
  country_code char(2) not null references public.countries(code),
  event_name text not null,
  date_from date not null,
  date_to date not null check (date_to >= date_from),
  impact_multiplier numeric(4, 3) not null check (impact_multiplier between 0.5 and 5),
  source text not null default 'admin',
  notes text,
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb,
  check (zone_id is not null or market_id is not null or country_code is not null)
);

create index idx_str_events_calendar_dates
  on public.str_events_calendar (country_code, date_from, date_to);
create index idx_str_events_calendar_market
  on public.str_events_calendar (market_id, date_from) where market_id is not null;
create index idx_str_events_calendar_zone
  on public.str_events_calendar (zone_id, date_from) where zone_id is not null;

alter table public.str_events_calendar enable row level security;

create policy str_events_calendar_select_authenticated on public.str_events_calendar
  for select to authenticated, anon
  using (true);

create policy str_events_calendar_write_admin on public.str_events_calendar
  for all to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_events_calendar is
  'Eventos calendario impactando demanda STR (F1, Semana Santa, NFL MX, etc). '
  'impact_multiplier > 1 boostea pricing recomendado, < 1 lo deprime.';

create table public.str_pricing_overrides (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('airbnb', 'vrbo', 'booking')),
  listing_id text not null,
  date date not null,
  override_price_minor bigint not null check (override_price_minor >= 0),
  currency char(3) not null references public.currencies(code),
  reason text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create unique index idx_str_pricing_overrides_unique
  on public.str_pricing_overrides (platform, listing_id, date);
create index idx_str_pricing_overrides_listing
  on public.str_pricing_overrides (platform, listing_id, date desc);

alter table public.str_pricing_overrides enable row level security;

create policy str_pricing_overrides_select_authenticated on public.str_pricing_overrides
  for select to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('asesor', 'mb_admin', 'admin_desarrolladora')
  );

create policy str_pricing_overrides_write on public.str_pricing_overrides
  for all to authenticated
  using (
    public.is_superadmin()
    or public.get_user_role() in ('asesor', 'mb_admin')
  )
  with check (
    public.is_superadmin()
    or public.get_user_role() in ('asesor', 'mb_admin')
  );

comment on table public.str_pricing_overrides is
  'Overrides manuales del pricing advisor (asesor o host directo). Toman precedencia '
  'sobre los suggested_price del modelo en 7b.K UI.';

-- Seed eventos MX 2026 (founder a refinar — fechas son indicativas).
insert into public.str_events_calendar (country_code, event_name, date_from, date_to, impact_multiplier, source, notes)
values
  ('MX', 'Semana Santa', '2026-03-29', '2026-04-05', 1.6, 'seed', 'Período vacacional alto'),
  ('MX', 'F1 GP CDMX', '2026-10-23', '2026-10-25', 2.5, 'seed', 'Foro Sol — pricing 2x normal'),
  ('MX', 'Día de Muertos', '2026-10-31', '2026-11-02', 1.7, 'seed', 'Demanda turística internacional'),
  ('MX', 'NFL México Game', '2026-11-15', '2026-11-15', 1.8, 'seed', 'Fecha tentativa NFL México 2026'),
  ('MX', 'Navidad / Año Nuevo', '2026-12-19', '2027-01-04', 1.5, 'seed', 'Vacaciones invernales'),
  ('MX', 'Verano vacaciones', '2026-07-15', '2026-08-15', 1.3, 'seed', 'Vacaciones escolares verano'),
  ('MX', 'Independencia', '2026-09-15', '2026-09-16', 1.2, 'seed', 'Fin de semana largo')
on conflict do nothing;
