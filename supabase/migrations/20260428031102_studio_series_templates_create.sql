-- F14.F.9 Sprint 8 BIBLIA Tarea 8.4 — studio_series_templates
-- Templates desarrolladora canon. Public read para catalogo. Insert/Update/Delete: service_role.

create table public.studio_series_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null check (category in ('residencial','comercial','mixto','custom')),
  description text,
  default_total_episodes integer not null check (default_total_episodes > 0),
  narrative_arc jsonb not null,
  visual_style jsonb not null default '{}'::jsonb,
  music_theme_mood text,
  thumbnail_storage_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_studio_series_templates_category on public.studio_series_templates(category);
create index idx_studio_series_templates_active on public.studio_series_templates(is_active);

alter table public.studio_series_templates enable row level security;

create policy studio_series_templates_select_authenticated on public.studio_series_templates
  for select to authenticated
  using (is_active);

comment on policy studio_series_templates_select_authenticated
  on public.studio_series_templates is
  'intentional_public_authed: Catalogo seed canon (4 templates desarrolladora) lectura libre para todos los asesores autenticados. Datos no sensibles compartidos.';

create trigger trg_studio_series_templates_updated_at
  before update on public.studio_series_templates
  for each row execute function public.set_updated_at();

comment on table public.studio_series_templates is
  'F14.F.9 Sprint 8 BIBLIA Tarea 8.4 — templates canon series desarrolladora. 4 seeds: residencial-clasico, residencial-premium, comercial-oficinas, mixto-residencial-comercial.';
