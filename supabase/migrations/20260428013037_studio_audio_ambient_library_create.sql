-- F14.F.7 Sprint 6 BIBLIA v4 §6 — Audio ambient library 12 presets canon (Upgrade 4 / Tarea 6.4).
-- DMX Studio dentro DMX único entorno (ADR-054). Lectura libre asesores autenticados.

create table public.studio_audio_ambient_library (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  context_tags text[] not null default '{}',
  storage_path text not null,
  duration_seconds numeric(6,2) not null default 30.0,
  is_active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_studio_audio_ambient_library_slug on public.studio_audio_ambient_library(slug);
create index idx_studio_audio_ambient_library_active on public.studio_audio_ambient_library(is_active) where is_active = true;

alter table public.studio_audio_ambient_library enable row level security;

create policy studio_audio_ambient_library_select_authenticated
  on public.studio_audio_ambient_library for select to authenticated
  using (true);

-- Seed 12 ambientes canon (slug + name es-MX + tags semantic)
insert into public.studio_audio_ambient_library (slug, name, description, context_tags, storage_path, duration_seconds) values
  ('ocean_view',         'Vista al mar',           'Olas suaves rompiendo, brisa marina relajante',           array['outdoor','nature','luxury','vista'],         'audio-ambient/ocean_view.mp3',        30.0),
  ('downtown_busy',      'Centro urbano',          'Ciudad en movimiento, tráfico ligero, vida cosmopolita',  array['urban','city','downtown','energetic'],        'audio-ambient/downtown_busy.mp3',     30.0),
  ('garden_birds',       'Jardín con aves',        'Pájaros cantando, viento entre hojas, naturaleza',        array['outdoor','nature','garden','calm'],          'audio-ambient/garden_birds.mp3',      30.0),
  ('kitchen_modern',     'Cocina activa',          'Cocina contemporánea con utensilios, ambiente cálido',    array['indoor','kitchen','warm','active'],          'audio-ambient/kitchen_modern.mp3',    30.0),
  ('fireplace_cozy',     'Chimenea hogareña',      'Crepitar de fuego, ambiente acogedor de invierno',        array['indoor','cozy','luxury','warm'],             'audio-ambient/fireplace_cozy.mp3',    30.0),
  ('park_kids',          'Parque familiar',        'Niños jugando a lo lejos, ambiente familiar alegre',      array['outdoor','family','park','social'],          'audio-ambient/park_kids.mp3',         30.0),
  ('rooftop_wind',       'Terraza con viento',     'Brisa elevada, ciudad a la distancia, libertad',          array['outdoor','urban','luxury','vista'],          'audio-ambient/rooftop_wind.mp3',      30.0),
  ('pool_water',         'Alberca tranquila',      'Agua moviéndose suavemente, atmósfera resort',            array['outdoor','luxury','water','calm'],           'audio-ambient/pool_water.mp3',        30.0),
  ('rain_window',        'Lluvia en ventana',      'Lluvia constante contra cristal, ambiente cozy',          array['indoor','cozy','calm','intimate'],           'audio-ambient/rain_window.mp3',       30.0),
  ('cafe_chatter',       'Café cosmopolita',       'Conversaciones suaves, espresso, ambiente social urbano', array['urban','social','cafe','warm'],              'audio-ambient/cafe_chatter.mp3',      30.0),
  ('forest_morning',     'Bosque al amanecer',     'Aves matutinas, hojas, ambiente eco rural premium',       array['outdoor','nature','luxury','eco'],           'audio-ambient/forest_morning.mp3',    30.0),
  ('office_open',        'Oficina abierta',        'Ambiente corporativo discreto, productividad moderna',    array['indoor','corporate','professional','active'],'audio-ambient/office_open.mp3',       30.0);
