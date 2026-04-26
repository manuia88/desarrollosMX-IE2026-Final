-- F1.B Climate Real — Voronoi nearest-station cache table.
-- Maps 228 CDMX zones (and future expansion) to nearest active NOAA / CONAGUA
-- station, computed once per source via haversine distance over zone centroid
-- and refreshed when station inventory changes.

CREATE TABLE IF NOT EXISTS public.zone_climate_station_map (
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  station_source TEXT NOT NULL CHECK (station_source IN ('noaa','conagua')),
  station_id TEXT NOT NULL,
  distance_meters NUMERIC NOT NULL CHECK (distance_meters >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (zone_id, station_source)
);

CREATE INDEX IF NOT EXISTS zone_climate_station_map_station_idx
  ON public.zone_climate_station_map (station_source, station_id);

ALTER TABLE public.zone_climate_station_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zone_climate_station_map_read_public
  ON public.zone_climate_station_map;
CREATE POLICY zone_climate_station_map_read_public
  ON public.zone_climate_station_map
  FOR SELECT
  TO anon, authenticated
  USING (true);
COMMENT ON POLICY zone_climate_station_map_read_public
  ON public.zone_climate_station_map IS
  'intentional_public: zone-station map is read-only metadata (no PII), exposes only NOAA/CONAGUA station IDs already public.';

DROP POLICY IF EXISTS zone_climate_station_map_service_role_all
  ON public.zone_climate_station_map;
CREATE POLICY zone_climate_station_map_service_role_all
  ON public.zone_climate_station_map
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.zone_climate_station_map IS
  'F1.B 2026-04-26: cache zone→nearest-station per source (noaa|conagua), used by climate fetchers Voronoi assignment.';
