// FASE 15.G.3 — Contracts shared types
// Canon: ADR-060 Contracts + e-sign STUB Mifiel/DocuSign H2 (ADR-018 4 señales).

export type ContractType = 'aps' | 'promesa' | 'reserva';

export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'cancelled' | 'expired';

export type ContractProvider = 'mifiel' | 'docusign';

export type ContractSignerRole = 'comprador' | 'vendedor' | 'asesor' | 'desarrolladora';

export interface ContractSigner {
  role: ContractSignerRole;
  name: string;
  email: string;
  phone?: string | null;
  rfc?: string | null;
  party_id?: string | null;
}

export interface ContractAuditEvent {
  event: 'created' | 'sent' | 'viewed' | 'signed' | 'cancelled' | 'expired' | 'webhook_received';
  actor_id: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface PreFilledContractData {
  unidad: {
    id: string | null;
    numero: string | null;
    tipo: string | null;
    price_mxn: number;
    area_m2: number | null;
    proyecto_id: string | null;
    proyecto_nombre: string | null;
  };
  esquema: {
    id: string | null;
    nombre: string | null;
    enganche_pct: number;
    mensualidades_count: number;
    contra_entrega_pct: number;
    comision_pct: number;
    iva_calc_logic: string;
    meses_gracia: number;
    financing_partner: string | null;
  };
  comprador: {
    id: string | null;
    nombre: string | null;
    email: string | null;
    telefono: string | null;
  };
  asesor: {
    id: string | null;
    nombre: string | null;
    email: string | null;
    rfc: string | null;
  };
  montos: {
    precio_unidad_mxn: number;
    enganche_mxn: number;
    contra_entrega_mxn: number;
    mensualidad_mxn: number;
    comision_asesor_mxn: number;
    iva_mxn: number;
    total_mxn: number;
  };
  meta: {
    operacion_id: string;
    operacion_codigo: string | null;
    operacion_status: string | null;
    contract_type: ContractType;
    generated_at: string;
  };
}
