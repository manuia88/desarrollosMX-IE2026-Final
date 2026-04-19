import type { FiscalDocGenerator, FiscalDocStatus, InvoiceInput } from './generator';
import { NotImplementedFiscalError } from './generator';

// STUB — activar en FASE 16 (Contabilidad + DTE SII) con cliente SII CL.
export class CLSiiGenerator implements FiscalDocGenerator {
  readonly country = 'CL';
  readonly provider = 'sii';
  readonly doc_type = 'factura_sii';

  async emit(
    _invoice: InvoiceInput,
  ): Promise<{ doc_id: string; xml?: string; pdf_url?: string; uuid?: string }> {
    throw new NotImplementedFiscalError(this.provider, 'emit');
  }

  async cancel(_doc_id: string, _reason: string): Promise<{ ok: boolean }> {
    throw new NotImplementedFiscalError(this.provider, 'cancel');
  }

  async query(_doc_id: string): Promise<FiscalDocStatus> {
    throw new NotImplementedFiscalError(this.provider, 'query');
  }
}
