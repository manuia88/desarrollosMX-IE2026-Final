import type { FiscalDocGenerator, FiscalDocStatus, InvoiceInput } from './generator';
import { NotImplementedFiscalError } from './generator';

export class MXFacturapiGenerator implements FiscalDocGenerator {
  readonly country = 'MX';
  readonly provider = 'facturapi';
  readonly cancel_reasons = ['01', '02', '03', '04'] as const;
  readonly doc_type = 'cfdi_4';

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
