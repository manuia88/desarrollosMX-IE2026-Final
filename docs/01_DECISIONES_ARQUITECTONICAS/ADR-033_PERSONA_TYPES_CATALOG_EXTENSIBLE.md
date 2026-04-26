# ADR-033 — `persona_types` catalog extensible (no enum hardcoded)

> **Status:** Aprobado 2026-04-25 (founder canon aplicado por PM — criterios memoria `feedback_arquitectura_escalable_desacoplada` + `feedback_aplicar_criterios_canon_zero_preguntas`)
> **Fase origen:** FASE 07.7.A.4 CRM Foundation
> **Reemplaza/Supersede:** Gate-1 propuesta inicial enum 4-valor (`buyer_self · asesor_lead · investor · masterbroker`)
> **Relacionado:** ADR-021 PPD · ADR-022 Vibe Tags · ADR-049 naming canon

## Contexto

Durante el cierre de Gates founder pre-FASE 07.7 surgió la pregunta: ¿`persona_type` para `buyer_twins` debe ser un enum hardcoded de 4 valores o un catalog extensible? La propuesta inicial (Gate-1 Opción A) era un enum cerrado:

```
enum persona_type { buyer_self, asesor_lead, investor, masterbroker }
```

Sin embargo, durante el diseño de A.4 emergieron 2 personas adicionales necesarias en H1:

- `family_member` — requerido por `family_units` + `family_unit_members` (M03 contactos H1).
- `referrer` — requerido por `referrals.persona_type_id` (ADR-034) cuando una persona sólo refiere sin participar en deal.

Agregar valores a un enum Postgres requiere `ALTER TYPE … ADD VALUE` que es transaccional pero no reversible sin downtime. Cada nueva persona en H2/H3 (potenciales: `appraiser`, `legal_counsel`, `corporate_buyer`, etc.) implicaría una migration con cascade impact en types TypeScript regenerados.

## Decisión

`persona_type` se modela como **catalog extensible** vía tabla `public.persona_types`:

```sql
create table public.persona_types (
  id uuid primary key,
  slug text unique not null,
  label_es text not null,
  label_en text not null,
  description text,
  active boolean default true,
  created_at timestamptz,
  updated_at timestamptz
);
```

Seeds canónicos H1 (6):

| Slug | Etiqueta ES | Uso |
|---|---|---|
| `buyer_self` | Comprador (yo mismo) | Comprador final autoservicio portal comprador |
| `asesor_lead` | Lead asesor | Prospecto manejado por asesor en CRM Sherpa |
| `investor` | Inversionista | Inversor inmobiliario (residencial/comercial/STR) |
| `masterbroker` | Masterbroker | Broker que opera red de asesores cross-agencia |
| `family_member` | Miembro de familia | Miembro de family_unit no-primario (cónyuge, hijo, etc.) |
| `referrer` | Referidor | Persona que refiere leads sin participar en operación directa |

Las tablas que referencian persona usan FK `persona_type_id uuid REFERENCES persona_types(id) ON DELETE RESTRICT`:

- `buyer_twins.persona_type_id`
- `referrals.persona_type_id`

## Consecuencias

### Positivas

- **Extensible sin downtime**: agregar persona nueva = `INSERT INTO persona_types (...) VALUES (...)`. Ningún ALTER TYPE/migration cascade.
- **i18n nativo**: `label_es` + `label_en` viven en BD, no en messages JSON. Frontend hace selector con un query SELECT.
- **Soft-delete**: marcar persona como `active=false` retira del UI sin perder histórico. ON DELETE RESTRICT bloquea borrado físico mientras existan rows referenciadas.
- **i18n + portales separados**: portal asesor puede ocultar `buyer_self` y mostrar solo `asesor_lead`/`investor`. Un atributo en frontend filtra con `WHERE active AND slug IN (...)`.
- **Consistente con catálogos shipped**: matchea pattern de `lead_sources`, `deal_stages`, `retention_policies`.

### Negativas

- **Validación tipo en runtime**: a diferencia de un enum Postgres, el motor BD no valida slug en INSERT — el FK `persona_type_id` valida UUID pero no slug. Mitigación: Zod schemas (`personaTypeSlugEnum`) validan en app layer + `slug` UNIQUE garantiza identificadores limpios.
- **Lookup overhead mínimo**: cada query que muestra persona requiere JOIN a `persona_types`. Solucionado con índice `idx_persona_types_active` y caching de catálogo en frontend (~100 bytes per persona).
- **Riesgo data corruption si admin INSERT slug malformado**: mitigado con `CHECK (slug ~ '^[a-z][a-z0-9_]{2,40}$')` en migration.

## Implementación

- Migration `20260425210000_crm_001_catalogs.sql` crea tabla + RLS + 6 seeds + CHECK slug format.
- Zod schema `features/crm/schemas/persona-types.ts` con `personaTypeSlugEnum` (6 valores) para validación app-side.
- tRPC `crm.catalogs.personaTypes` query expuesto a `authenticated` para selectors UI.
- RLS: `SELECT public anon+authenticated` (catalog no-PII) · `INSERT/UPDATE/DELETE` solo `superadmin`.

## Alternativas consideradas

- **Enum Postgres hardcoded**: rechazada por costo de extensión H2/H3.
- **Enum jsonb en buyer_twins**: rechazada por D7 single-source-of-truth (jsonb solo cuando shape variable, persona es estructurado).
- **Tabla con valores 4-only sin extensibilidad**: rechazada porque al permitir extensibilidad SQL trivial (`INSERT`) no hay razón para limitarla.

## Referencias

- ADR-021 Progressive Preference Discovery
- ADR-022 Vibe Tags
- ADR-049 naming canon (operaciones/fiscal)
- Memoria `feedback_arquitectura_escalable_desacoplada.md`
- Memoria `feedback_aplicar_criterios_canon_zero_preguntas.md`
- `docs/02_PLAN_MAESTRO/FASE_07.7_CRM_FOUNDATION.md`
