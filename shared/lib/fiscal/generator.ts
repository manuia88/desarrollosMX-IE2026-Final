export type InvoiceLine = {
  description: string;
  quantity: number;
  unit_price_minor: number;
  tax_rate?: number;
  sku?: string;
};

export type InvoiceInput = {
  country_code: string;
  issuer_id: string;
  customer: {
    name: string;
    tax_id: string;
    email?: string;
    address?: string;
  };
  currency: string;
  lines: InvoiceLine[];
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  meta?: Record<string, unknown>;
};

export type FiscalDocStatus = {
  doc_id: string;
  status: 'draft' | 'issued' | 'accepted' | 'rejected' | 'canceled';
  uuid_extern?: string;
  xml_url?: string;
  pdf_url?: string;
  issued_at?: string;
  canceled_at?: string;
  cancel_reason?: string;
  error?: string;
};

export interface FiscalDocGenerator {
  readonly country: string;
  readonly provider: string;

  emit(
    invoice: InvoiceInput,
  ): Promise<{ doc_id: string; xml?: string; pdf_url?: string; uuid?: string }>;
  cancel(doc_id: string, reason: string): Promise<{ ok: boolean }>;
  query(doc_id: string): Promise<FiscalDocStatus>;
}

export class NotImplementedFiscalError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider}.${method} not implemented — stub until FASE 16`);
    this.name = 'NotImplementedFiscalError';
  }
}
