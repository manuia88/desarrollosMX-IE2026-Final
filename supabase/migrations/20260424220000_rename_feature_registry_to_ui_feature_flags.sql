-- BATCH 5 pre-Opción D — Canonical catalog naming refactor (ADR-029).
--
-- Rationale: naming ambiguo `feature_registry` confundible con score-registry.ts
-- (score calculators IE) y FEATURE_INVENTORY.md (catálogo producto humano).
-- Detectado durante auditoría integral 2026-04-24 (§13 punto 5): CC auditor
-- generó false positive reportado como "desync 138 TS vs 120 DB" — eran catálogos
-- diferentes sin obligación de sync.
--
-- Cambio: ALTER TABLE public.feature_registry RENAME TO ui_feature_flags.
-- FKs role_features.feature_code + profile_feature_overrides.feature_code
-- adaptan automáticamente (constraint names usan feature_code, no feature_registry:
--   role_features_feature_code_fkey, profile_feature_overrides_feature_code_fkey).
--
-- Rename coordinado:
--   - 1 trigger: trg_audit_feature_registry → trg_audit_ui_feature_flags
--   - 4 policies: feature_registry_* → ui_feature_flags_*
--
-- Referencias: docs/06_AUDITORIAS/AUDIT_FASE_0_A_11S_2026-04-24.md §13,
--   docs/01_DECISIONES_ARQUITECTONICAS/ADR-029_CANONICAL_CATALOG_NAMING.md.
-- Allowlist bump a v26 en migration siguiente 20260424220100.

-- Step 1: rename tabla
alter table public.feature_registry rename to ui_feature_flags;

-- Step 2: rename policies (4)
alter policy feature_registry_delete_super on public.ui_feature_flags rename to ui_feature_flags_delete_super;
alter policy feature_registry_insert_super on public.ui_feature_flags rename to ui_feature_flags_insert_super;
alter policy feature_registry_select_public on public.ui_feature_flags rename to ui_feature_flags_select_public;
alter policy feature_registry_update_super on public.ui_feature_flags rename to ui_feature_flags_update_super;

-- Step 3: rename trigger
alter trigger trg_audit_feature_registry on public.ui_feature_flags rename to trg_audit_ui_feature_flags;

-- Step 4: comment table con rationale
comment on table public.ui_feature_flags is
  'Feature flags UI/API tier-gating (pro/free/enterprise). '
  'Renamed from feature_registry 2026-04-24 (BATCH 5 pre-Opción D) para naming non-ambiguo. '
  'NO confundir con score-registry.ts (score calculators IE) ni FEATURE_INVENTORY.md (catálogo docs producto). '
  'Ver ADR-029 canonical-catalog-naming.';
