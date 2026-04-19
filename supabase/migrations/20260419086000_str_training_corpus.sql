-- FASE 07b / BLOQUE 7b.O — Training corpus preparation (H3 seed).
-- NO ENTRENA aquí — solo prepara dataset versionado para H3 future training.

create table public.ml_training_snapshots (
  id uuid primary key default gen_random_uuid(),
  corpus_name text not null,
  version text not null,
  schema_hash text not null,
  row_count bigint not null,
  storage_path text not null,
  format text not null check (format in ('parquet', 'jsonl', 'csv')),
  split text check (split in ('train', 'val', 'test', 'full')),
  country_code char(2) references public.countries(code),
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  meta jsonb not null default '{}'::jsonb
);

create unique index idx_ml_training_unique
  on public.ml_training_snapshots (corpus_name, version, split);
create index idx_ml_training_corpus on public.ml_training_snapshots (corpus_name, created_at desc);

alter table public.ml_training_snapshots enable row level security;

create policy ml_training_select_admin on public.ml_training_snapshots
  for select to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin');

create policy ml_training_write_admin on public.ml_training_snapshots
  for all to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin')
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.ml_training_snapshots is
  'Metadata de snapshots exportados para training H3 (modelos propietarios '
  'que reemplazarán AirROI/GPT-4o-mini). El contenido se almacena en Supabase '
  'Storage bucket ml-corpus (retención 5 años). NO usable para training hasta '
  '≥12m de datos acumulados + budget compute (>$50K).';

create table public.str_reviews_labels (
  id bigint generated always as identity primary key,
  review_id text not null,
  platform text not null,
  posted_at date not null,
  sentiment_label numeric(4, 3) not null check (sentiment_label between -1 and 1),
  topics_label jsonb,
  labeled_by uuid not null references public.profiles(id),
  labeled_at timestamptz not null default now(),
  notes text,
  meta jsonb not null default '{}'::jsonb
);

create index idx_str_labels_review
  on public.str_reviews_labels (platform, review_id, posted_at);
create index idx_str_labels_labeler
  on public.str_reviews_labels (labeled_by, labeled_at desc);

alter table public.str_reviews_labels enable row level security;

create policy str_labels_select_admin on public.str_reviews_labels
  for select to authenticated
  using (public.is_superadmin() or public.get_user_role() = 'mb_admin');

create policy str_labels_insert_admin on public.str_reviews_labels
  for insert to authenticated
  with check (public.is_superadmin() or public.get_user_role() = 'mb_admin');

comment on table public.str_reviews_labels is
  'Ground-truth human-verified labels para reviews (sentiment + topics). '
  'Input para training supervisado H3 del sentiment model propietario '
  'que reemplazará Anthropic Haiku en 7b.D. Target: ≥5% de str_reviews.';

create or replace function public.ml_deterministic_split(p_listing_id text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when (('x' || substr(md5(p_listing_id), 1, 8))::bit(32)::int % 100) < 70 then 'train'
    when (('x' || substr(md5(p_listing_id), 1, 8))::bit(32)::int % 100) < 85 then 'val'
    else 'test'
  end;
$$;

comment on function public.ml_deterministic_split(text) is
  'Deterministic train/val/test split por hash(listing_id). 70/15/15.';
