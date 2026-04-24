-- Backfill dmx_indices.scope_id: UUID zones.id → canonical zones.scope_id
-- Idempotent: solo actualiza filas donde scope_id matchea zones.id UUID pattern

UPDATE public.dmx_indices di
SET scope_id = z.scope_id
FROM public.zones z
WHERE di.scope_id = z.id::text
  AND di.scope_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
