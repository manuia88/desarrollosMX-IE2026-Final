# content/zones — Canonical Geographic Entities

Source of truth for DMX multi-country geographic entities (countries, states, cities, municipios/alcaldías, colonias/barrios, ZIPs, census tracts). Seeds the polymorphic `public.zones` table — single catalog that composes with indices, operations, analytics.

## Estructura

```
content/zones/
  README.md                     ← este archivo
  schema.json                   ← JSON Schema Draft 07 para validación IDE
  {country_code_lowercase}/     ← un directorio por país (mx/, co/, ar/, br/, us/)
    README.md                   ← taxonomy específica del país
    country.json                ← entrada raíz (scope_type=country)
    estados|states|.../         ← siguiente nivel administrativo
      *.json                    ← uno por entidad
    {estado_slug}/              ← sub-estructura por estado
      city.json                 ← si aplica (CDMX, BA, etc.)
      alcaldias|municipios|.../
        *.json                  ← archivo nested: entidad admin + children (colonias/barrios)
```

## Cómo agregar un país nuevo

1. Crear directorio `{cc}/` (ej `co/` para Colombia).
2. Crear `{cc}/country.json` con scope_type=country, parent_scope_id=null, admin_level=2.
3. Crear sub-estructura admin siguiendo la taxonomy del país (ver `{cc}/README.md`).
4. Cada entrada sigue `shared/schemas/zones.ts` → `zoneEntrySchema`.
5. Archivos que agrupan entidad admin + children usan `zoneNestedFileSchema` (ej alcaldía + colonias).

## Cómo procesa el script seed

1. **Recursive walk** de `content/zones/` (todos los `.json` excepto `schema.json`).
2. **Zod validate** cada entry contra `zoneEntrySchema` o `zoneNestedFileSchema`.
3. **Topological sort** por `admin_level` ASC (country=2 primero, colonia=10 último) — garantiza FK a parent_scope_id existe.
4. **Upsert idempotente** a `public.zones`:
   - UUID v5 determinístico (namespace DMX) desde `(country_code, scope_type, scope_id)` → id estable entre runs.
   - ON CONFLICT (country_code, scope_type, scope_id) DO UPDATE de campos mutables (name_*, lat, lng, area_km2, population, metadata).
5. **Report** final: entries creadas/actualizadas/skipped por scope_type.

## Referencias

- ADR-030: CANONICAL_ZONES_POLYMORPHIC — decisión arquitectónica del catálogo polymorphic.
- `shared/schemas/zones.ts` — Zod Single Source of Truth.
- `supabase/migrations/*create_zones*.sql` — schema BD con CHECK constraints y RLS.
