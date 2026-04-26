# ADR-034 — `referrals` polymorphic `source_type` / `target_type`

> **Status:** Aprobado 2026-04-25 (founder canon aplicado por PM — criterios memoria `feedback_aplicar_criterios_canon_zero_preguntas`)
> **Fase origen:** FASE 07.7.A.4 CRM Foundation
> **Precedent:** ADR-030 zones polymorphic (zona/colonia/alcaldía vía `scope_type`)
> **Relacionado:** ADR-009 security model · ADR-018 E2E connectedness · ADR-035 retention multi-país

## Contexto

DMX necesita atribuir referidos cross-entity (persona refiere otra persona, asesor refiere deal a otro asesor, comprador refiere operación a otro inversionista). Requerimientos:

1. Cualquier entidad puede ser **source** del referido: usuario, desarrolladora, deal previo.
2. Cualquier entidad puede ser **target**: usuario nuevo, deal generado, operación cerrada.
3. Atribución multi-hop (chain): `A → B → C → cierre`, pago proporcional.
4. Reward calculable y pagable cuando deal cierra.
5. Compliance con LGPD/LFPDPPP (reward histórico preservable).

Modelar 9 tablas separadas (3 source × 3 target = 9 combinaciones) explota mantenimiento. Dos opciones canónicas:

**Opción A — Polymorphic single table** (matchea ADR-030 zones precedent):
```sql
create table referrals (
  source_type text check in ('user','developer','deal'),
  source_id uuid not null,
  target_type text check in ('user','deal','operacion'),
  target_id uuid not null
);
```

**Opción B — Multiple FK columns con NULL**:
```sql
create table referrals (
  source_user_id uuid references profiles,
  source_developer_id uuid references desarrolladoras,
  source_deal_id uuid references deals,
  target_user_id uuid references profiles,
  target_deal_id uuid references deals,
  target_operacion_id uuid references operaciones,
  CHECK (one of source_* not null AND one of target_* not null)
);
```

## Decisión

**Opción A — polymorphic source/target** alineada con ADR-030 zones precedent.

```sql
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  source_type text check (source_type in ('user','developer','deal')),
  source_id uuid not null,
  target_type text check (target_type in ('user','deal','operacion')),
  target_id uuid not null,
  persona_type_id uuid references persona_types(id),
  status text default 'pending',
  attribution_chain jsonb default '[]'::jsonb,
  reward_amount numeric(14,2),
  reward_currency char(3),
  country_code char(2),
  expires_at timestamptz,
  attributed_at timestamptz,
  ...
);
```

FK enforcement vía **trigger BEFORE INSERT/UPDATE** que resuelve `(source_type, source_id)` y `(target_type, target_id)` contra la tabla apropiada (`profiles | desarrolladoras | deals | operaciones`). Función `fn_validate_referral_polymorphic_fks()` SECURITY DEFINER + auth.uid() guard.

## Consecuencias

### Positivas

- **Schema flexible**: agregar `source_type='campaign'` H2 = `ALTER TABLE … DROP CONSTRAINT … ADD CHECK (in 'user','developer','deal','campaign')` + actualizar resolver. Cero ALTER TYPE migrations.
- **Matchea precedent shipped** ADR-030 zones polymorphic — audit_rls_violations v27 ya reconoce el pattern.
- **Queries con índices**: `(source_type, source_id)` + `(target_type, target_id)` cubren 95% de lookups.
- **`attribution_chain jsonb`** justifica D7 (chain dinámica multi-hop variable, no normalizable).
- **Self-referral block** vía CHECK constraint: `NOT (source_type = target_type AND source_id = target_id)`.

### Negativas

- **No FK enforcement DDL**: si alguien hace INSERT vía service_role bypass, podría meter `source_id` inexistente. Mitigación: trigger BEFORE bloquea (service_role NO bypassa triggers BEFORE — confirmado Postgres docs).
- **Cross-table joins requieren UNION o app-layer**: query "referrals donde source es profile X" requiere `WHERE source_type='user' AND source_id=X`. UI app-layer puede agregar el join transparente.
- **Trigger cost INSERT/UPDATE ~5-15ms** por validación polymorphic. Aceptable para frecuencia esperada (<1K referrals/día H1).

## Implementación

- Migration `20260425210500_crm_006_referrals.sql` crea tabla + 7 índices + RLS + trigger validation + resolver utility.
- Trigger `fn_validate_referral_polymorphic_fks()` SECURITY DEFINER + `auth.uid()` guard valida existence en source/target tablas.
- Utility `resolve_polymorphic_referral_source(s_type, s_id)` retorna jsonb consistente para UI.
- Zod schema `features/crm/schemas/referrals.ts` con `referralSourceTypeEnum` + `referralTargetTypeEnum` + self-referral refine.
- tRPC `crm.referral.attribute` mutation crea referral; `crm.referral.list` query con filters.
- RLS: source/target user ven sus propios; asesor ve referrals donde target es deal asignado; admin all.

## Alternativas rechazadas

- **Opción B (multiple FK NULL)**: rechazada por explosion en 6 columnas con CHECK constraints complejos + queries `OR` lentas + nullable FK indices subóptimos.
- **9 tablas separadas**: rechazada por mantenimiento + reportes cross-table dolorosos.

## Referencias

- ADR-030 zones polymorphic (precedent canon)
- ADR-018 E2E connectedness (audit triggers + STUB markers)
- ADR-009 security model RLS (SECDEF + search_path D3)
- `docs/02_PLAN_MAESTRO/FASE_07.7_CRM_FOUNDATION.md`
- Memoria `feedback_arquitectura_escalable_desacoplada.md`
