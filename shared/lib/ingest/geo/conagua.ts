// DEPRECATED H1 — CONAGUA driver moved to shared/lib/ingest/climate/conagua-smn.ts
// (refactor F1.B 2026-04-26: STUB H2 → real SMN scraper).
// Redirect re-export preserves any legacy import paths. New code must import
// from '@/shared/lib/ingest/climate/conagua-smn'.

export {
  CONAGUA_FEATURE_FLAG,
  CONAGUA_SOURCE,
  conaguaDriver,
  ingestConagua,
} from '../climate/conagua-smn';
