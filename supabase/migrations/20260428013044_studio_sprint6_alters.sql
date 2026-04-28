-- F14.F.7 Sprint 6 BIBLIA v4 §6 — ALTER tables existentes para Multi-Batch + Heat-Map.
-- DMX Studio dentro DMX único entorno (ADR-054).
-- Upgrade 7: virtual_staging multi-batch (batch_id + is_batch_member).
-- Upgrade 8: drone heat map suggestion column.

alter table public.studio_virtual_staging_jobs
  add column if not exists batch_id uuid,
  add column if not exists is_batch_member boolean not null default false;

create index if not exists idx_studio_virtual_staging_batch
  on public.studio_virtual_staging_jobs(batch_id) where batch_id is not null;

alter table public.studio_drone_simulations
  add column if not exists heat_map_suggestion text,
  add column if not exists heat_map_reasoning text;
