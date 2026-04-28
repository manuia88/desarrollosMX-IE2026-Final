# photographer-clients-cross-feature

ADR-057 — Studio Sprint 9 cross-feature M03 Contactos/Leads + M07 Operaciones.

## STUB ADR-018 (4 señales)

`recordVideoSaleAsOperacion` STUB H1.

### Flip path H2

1. Alter `operaciones.operacion_type` CHECK constraint para incluir `'studio_video_sale'`.
2. Reemplazar STUB body con INSERT real en `operaciones` con metadata photographer_id.
3. Update Studio UI condicional para mostrar M07 export feature.
4. Tests integration M07 → operaciones tracking.

## Read API

- `fetchLeadsForPhotographer` — read leads M03 asignados al asesor (que devino fotógrafo).
- `importLeadsAsPhotographerClients` — bulk import leads → studio_photographer_clients.

## Write API STUB

- `recordVideoSaleAsOperacion` — STUB H1 (NOT_IMPLEMENTED_H2). Flip cuando founder valida demand.
