# MX — Taxonomía geográfica México

Jerarquía administrativa y mapping a `zones.scope_type`.

## Niveles

| Nivel | scope_type | admin_level | Ejemplo | Cantidad |
|-------|------------|-------------|---------|----------|
| País | `country` | 2 | MX | 1 |
| Estado / Entidad federativa | `estado` | 4 | Ciudad de México, Jalisco | 32 (H1: solo CDMX) |
| Ciudad (cabecera / municipio capital) | `city` | 6 | CDMX como conurbación | 1 por estado (cuando aplica) |
| Alcaldía (CDMX) / Municipio (resto) | `alcaldia` / `municipio` | 8 | Benito Juárez, Coyoacán | CDMX: 16 alcaldías. Resto: ~2,469 municipios |
| Colonia / Barrio | `colonia` | 10 | Roma Norte, Del Valle Centro | CDMX: ~4,000 total (H1: ~200 representativas) |

Notas:
- CDMX es caso especial: estado + city coinciden territorialmente, pero se modelan separados para soportar estados con múltiples ciudades (Jalisco → Guadalajara, Zapopan, Tlaquepaque).
- Alcaldías (16) son unidades políticas específicas de CDMX desde reforma 2016 (antes delegaciones). Otros estados usan `municipio`.
- Colonias no tienen estatus legal formal uniforme — son divisiones vecinales reconocidas por INEGI y gobiernos locales.

## H1 scope (v1_h1_cdmx)

- 1 country (MX)
- 1 estado (CDMX)
- 1 city (CDMX)
- 16 alcaldías
- ~200 colonias representativas (distribuidas en las 16 alcaldías, priorizando zonas de alto tráfico inmobiliario y reconocimiento público)

Post-H1 (L-NN agendados): resto de estados, municipios, ampliación colonias, ZIPs MX (CPs INEGI), census tracts (AGEBs).

## Data sources

- **INEGI Marco Geoestadístico Nacional** (fuente primaria): nombres oficiales estados, municipios, alcaldías, AGEBs.
- **Gobierno CDMX — Sistema de Información del Desarrollo Social** (colonias CDMX oficiales).
- **INEGI Censo 2020** (population áreas admin ≥ 8).
- **Conocimiento público** (centroide lat/lng colonias cuando INEGI no expone).

Cada entry marca su origen en `metadata.data_source` (`inegi` | `manual` | etc).
