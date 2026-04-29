// FASE 15.H — 9 notification types deferred to FASE 16
// STUB ADR-018 (4 señales): tabla notifications/notification_types NO existe en BD.
// Agendar: L-NEW-NOTIFICATIONS-DEV-SCHEMA-FASE-16 en LATERAL_UPGRADES_PIPELINE.md
//
// Heurística mensaje validación: cualquier dispatch retorna { skipped: true, reason: 'notifications_table_pending_fase_16' }
// para que el caller pueda no-op silenciosamente sin reventar.

export const DEV_NOTIFICATION_TYPES = [
  'plan_limit_approaching',
  'plan_limit_reached',
  'document_uploaded',
  'document_extracted',
  'document_approved',
  'document_rejected',
  'api_key_created',
  'api_key_revoked',
  'export_completed',
] as const;
export type DevNotificationType = (typeof DEV_NOTIFICATION_TYPES)[number];

export type NotificationDispatchResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: 'notifications_table_pending_fase_16' };

// STUB — activar cuando shipped tabla notifications + notification_types (FASE 16).
export function dispatchDevNotification(_args: {
  profileId: string;
  type: DevNotificationType;
  payload?: Record<string, unknown>;
}): NotificationDispatchResult {
  return {
    ok: false,
    skipped: true,
    reason: 'notifications_table_pending_fase_16',
  };
}
