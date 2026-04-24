-- BLOQUE 11.R.-1 — Zone Constellations GIN index sobre edge_types jsonb.
--
-- Filosofía escalable (memoria feedback_arquitectura_escalable_desacoplada):
-- el filtrado por edge_types (migration|climate_twin|genoma|pulse) será
-- el hot path del UI D3 + sliders + contagion paths + Futures correlation
-- boost. Sin GIN, queries sobre edge_types->>'migration' serían seq scan
-- a escala nacional (10k+ edges). Con GIN jsonb_path_ops: O(log N) igual
-- que pgvector HNSW en Climate Twin (11.P).
--
-- Segundo index (source_colonia_id, edge_weight desc) acelera el "top 50
-- neighbors per zone" query que alimenta el graph viewport.

create index if not exists zone_constellations_edges_types_gin
  on public.zone_constellations_edges
  using gin (edge_types jsonb_path_ops);

comment on index public.zone_constellations_edges_types_gin is
  'GIN jsonb_path_ops: filtrado por edge_types (migration|climate_twin|'
  'genoma|pulse) en hot path UI sliders + contagion + Futures boost. '
  'Escalable a nacional (10k+ edges) sin seq scan.';

create index if not exists zone_constellations_edges_weight_idx
  on public.zone_constellations_edges (source_colonia_id, edge_weight desc);

comment on index public.zone_constellations_edges_weight_idx is
  'BTree compuesto: "top N neighbors per zone" viewport del graph D3. '
  'Evita full table scan sobre weight al cargar foco de colonia.';
