// ADR-057 — Studio Sprint 9 cross-feature M03 Contactos/Leads + M07 Operaciones integration.
// Read-only API sobre leads + STUB write operaciones para Studio Sprint 9 Photographer flow.

import { createAdminClient } from '@/shared/lib/supabase/admin';

export interface LeadForImport {
  readonly id: string;
  readonly contactName: string;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly status: string;
  readonly zoneId: string;
  readonly createdAt: string;
}

export interface FetchLeadsForPhotographerInput {
  readonly assignedAsesorId: string;
  readonly filterCriteria?: {
    readonly zoneId?: string;
    readonly status?: string;
    readonly limit?: number;
  };
}

export async function fetchLeadsForPhotographer(
  input: FetchLeadsForPhotographerInput,
): Promise<ReadonlyArray<LeadForImport>> {
  const supabase = createAdminClient();
  const limit = input.filterCriteria?.limit ?? 100;
  let query = supabase
    .from('leads')
    .select('id, contact_name, contact_email, contact_phone, status, zone_id, created_at')
    .eq('assigned_asesor_id', input.assignedAsesorId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (input.filterCriteria?.zoneId) {
    query = query.eq('zone_id', input.filterCriteria.zoneId);
  }
  if (input.filterCriteria?.status) {
    query = query.eq('status', input.filterCriteria.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`fetchLeadsForPhotographer failed: ${error.message}`);

  return (data ?? []).map((lead) => ({
    id: lead.id,
    contactName: lead.contact_name,
    contactEmail: lead.contact_email,
    contactPhone: lead.contact_phone,
    status: lead.status,
    zoneId: lead.zone_id,
    createdAt: lead.created_at,
  }));
}

export interface ImportLeadsAsClientsResult {
  readonly imported: number;
  readonly skipped: number;
  readonly clientIds: ReadonlyArray<string>;
}

export async function importLeadsAsPhotographerClients(
  photographerId: string,
  leads: ReadonlyArray<LeadForImport>,
): Promise<ImportLeadsAsClientsResult> {
  const supabase = createAdminClient();
  const validLeads = leads.filter((l) => l.contactEmail !== null);

  if (validLeads.length === 0) {
    return { imported: 0, skipped: leads.length, clientIds: [] };
  }

  const { data: existing } = await supabase
    .from('studio_photographer_clients')
    .select('client_email')
    .eq('photographer_id', photographerId)
    .in(
      'client_email',
      validLeads.map((l) => l.contactEmail as string),
    );

  const existingEmails = new Set((existing ?? []).map((e) => e.client_email));
  const toInsert = validLeads.filter((l) => !existingEmails.has(l.contactEmail as string));

  if (toInsert.length === 0) {
    return { imported: 0, skipped: leads.length, clientIds: [] };
  }

  const { data: inserted, error } = await supabase
    .from('studio_photographer_clients')
    .insert(
      toInsert.map((l) => ({
        photographer_id: photographerId,
        client_email: l.contactEmail as string,
        client_name: l.contactName,
        client_phone: l.contactPhone,
        relation_status: 'pending' as const,
      })),
    )
    .select('id');

  if (error) throw new Error(`importLeadsAsPhotographerClients failed: ${error.message}`);

  return {
    imported: toInsert.length,
    skipped: leads.length - toInsert.length,
    clientIds: (inserted ?? []).map((r) => r.id),
  };
}

// STUB ADR-018 — activar H2 cuando operaciones.operacion_type CHECK altered para 'studio_video_sale'.
// H1 path: tracking via studio_photographer_clients.total_revenue_attributed.
export interface RecordVideoSaleAsOperacionInput {
  readonly photographerId: string;
  readonly clientId: string;
  readonly videoId: string;
  readonly amount: number;
  readonly currency: string;
}

export async function recordVideoSaleAsOperacion(
  _input: RecordVideoSaleAsOperacionInput,
): Promise<{ readonly ok: false; readonly reason: 'NOT_IMPLEMENTED_H2' }> {
  // STUB ADR-018 — flip H2 cuando operaciones.operacion_type CHECK altered.
  return { ok: false, reason: 'NOT_IMPLEMENTED_H2' };
}
