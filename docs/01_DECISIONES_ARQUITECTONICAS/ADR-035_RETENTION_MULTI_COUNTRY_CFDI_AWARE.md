# ADR-035 — Retention multi-país CFDI-aware (`retention_policies` canonical)

> **Status:** Aprobado 2026-04-25 (founder canon aplicado por PM — criterios memoria `feedback_aplicar_criterios_canon_zero_preguntas` + `feedback_arquitectura_escalable_desacoplada`)
> **Fase origen:** FASE 07.7.A.4 CRM Foundation
> **Relacionado:** ADR-009 security model D7 append-only · ADR-018 E2E audit canon · `docs/05_OPERACIONAL/05.6_DATA_RETENTION_POLICY.md`

## Contexto

DMX opera multi-país día 1 (MX/CO/AR/BR + en-US placeholder). Cada jurisdicción exige retention diferente para PII + soportes contables:

| País | Norma PII | Norma fiscal | Notes breach |
|---|---|---|---|
| MX | LFPDPPP "tiempo necesario" + LGPDPPSO | CFF Art. 30 — 5 años (CFDI 10y archive recomendado) | INAI |
| CO | Ley 1581 + Decreto 1377 | DIAN Art. 632 ET — 10 años | SIC |
| AR | Ley 25.326 + AAIP | AFIP RG 1415/4290 — 10 años fiscal · 7y CRM | AAIP |
| BR | LGPD (Lei 13.709) — 72h breach notif. | Receita CTN Art. 195 — 5-7 años | ANPD |

Sin policy unificada, los compliance requirements quedan codificados ad-hoc en triggers/cron por entity_type, riesgo de drift y no-coverage.

## Decisión

Tabla canónica `public.retention_policies` con seed inicial de **28 rows = 4 países × 7 entity_types**:

```sql
create table public.retention_policies (
  id uuid primary key,
  country_code char(2) references countries(code),
  entity_type text check in (
    'lead', 'deal', 'operacion', 'buyer_twin',
    'fiscal_doc', 'behavioral_signal', 'audit_crm_log'
  ),
  retention_years smallint check between 1 and 50,
  jurisdiction_ref text not null,  -- LFPDPPP | CFF-Art30 | DIAN-Art632ET | AFIP-RG4290 | Receita-CTN195 | LGPD | Ley1581 | Ley25326
  notes text,
  active boolean default true,
  unique (country_code, entity_type)
);
```

### Seeds canónicos (28 rows)

**MX (LFPDPPP + CFF Art. 30):**
- lead/deal/operacion/buyer_twin/fiscal_doc: 5y
- behavioral_signal: 2y (privacy minimization)
- audit_crm_log: 7y

**CO (Ley 1581 + DIAN Art. 632 ET):**
- lead/deal/operacion/buyer_twin/fiscal_doc/audit_crm_log: 10y
- behavioral_signal: 2y

**AR (Ley 25.326 + AFIP RG 4290):**
- lead/deal/operacion/buyer_twin: 7y
- fiscal_doc/audit_crm_log: 10y
- behavioral_signal: 2y

**BR (LGPD + Receita CTN Art. 195):**
- lead/deal/operacion/buyer_twin/fiscal_doc: 7y
- audit_crm_log: 10y (conservador)
- behavioral_signal: 2y

### Cron `crm_retention_cleanup`

Función `fn_crm_retention_cleanup()` (STUB FASE 06 enforcement) lee `retention_policies WHERE active=true` y aplica:

- `entity_type='lead'/'deal'` → DELETE rows con `created_at < now() - retention_years` AND `status NOT IN ('legal_hold')`
- `entity_type='operacion'` → ANONYMIZE PII (NO delete — legal hold fiscal)
- `entity_type='buyer_twin'` → ANONYMIZE PII + embedding NULL
- `entity_type='fiscal_doc'` → archive cold storage S3 + delete row
- `entity_type='behavioral_signal'` → DELETE (regenerable, partition drop via pg_partman)
- `entity_type='audit_crm_log'` → drop_partition ≥ retention_years (immutable)

Observability obligatoria: `INSERT INTO ingest_runs(source='crm_retention_cleanup', summary=...)` cada ejecución (memoria `feedback_cron_observability_obligatorio`).

## Consecuencias

### Positivas

- **Single source of truth** retention compliance — frontend muestra "tus datos retenidos X años per ley Y" leyendo retention_policies (RLS public_authed).
- **Configurable sin migration**: cambio AR de 7y → 10y H2 = `UPDATE retention_policies SET retention_years=10 WHERE country_code='AR' AND entity_type='lead'`. Cron next-run aplica automáticamente.
- **Soft-deprecate** vía `active=false` preserva histórico de policies (legal audit trail).
- **Multi-país consistente**: misma lógica MX/CO/AR/BR con valores diferenciados.
- **Audit_crm_log retention 7-10y** suprema todas las normas (CFDI 10y MX, DIAN 10y CO, AFIP 10y AR, Receita 7y BR — DMX usa 10y conservador en CO/AR/BR + 7y MX).

### Negativas

- **Cron requiere FASE 06 enforcement**: hasta entonces, retention NO se aplica. Mitigación: STUB function + documentar limitación + hard deadline FASE 06.
- **Anonymization vs DELETE per entity**: requiere lógica condicional en cron. Aceptado — la simplicidad de "always DELETE" no funciona para fiscal compliance.
- **`behavioral_signal` 2y** menor que `audit_log` 7y: justificable (privacy minimization LFPDPPP), pero requiere documentación clara para legal review.
- **Cross-país queries** requieren JOIN con retention_policies si el frontend muestra "este lead vivirá X años". Mitigación: caching de catálogo en client.

## Implementación

- Migration `20260425210000_crm_001_catalogs.sql` crea tabla + 28 seeds + RLS public_authed.
- Migration `20260425210900_crm_010_domain_triggers.sql` declara `fn_crm_retention_cleanup()` STUB.
- FASE 06 enforcement: implementación real cron + observability + tests anonymization.
- Zod schema `features/crm/schemas/retention-policies.ts` con `retentionEntityTypeEnum` (7 valores).
- tRPC `crm.catalogs.retentionPolicies` query authenticated.
- RLS: SELECT public_authed (config compliance pública) · INSERT/UPDATE/DELETE solo superadmin.

## Alternativas rechazadas

- **Hardcoded retention en triggers per tabla**: rechazada — drift inevitable cross-tabla, imposible de auditar sin grep.
- **Enum entity_type fixed**: rechazada — añadir entidades H2 (`legal_doc`, `notification`, `loyalty_record`) requeriría ALTER TYPE.
- **Single retention global 5y**: rechazada — viola compliance CO/AR/BR (10y mínimo fiscal).

## Cumplimiento verificable

Test post-implementation FASE 06:

```sql
select country_code, entity_type, retention_years, jurisdiction_ref
from retention_policies
where active = true
order by country_code, entity_type;
-- Esperado: 28 rows = 4 × 7
```

## Referencias

- ADR-009 D7 audit append-only
- ADR-018 E2E audit canon
- `docs/05_OPERACIONAL/05.6_DATA_RETENTION_POLICY.md`
- Memoria `feedback_cron_observability_obligatorio.md`
- LFPDPPP — <https://home.inai.org.mx>
- DIAN Estatuto Tributario — Art. 632
- AFIP RG 1415/4290
- Receita Federal CTN Art. 195 + LGPD Lei 13.709
