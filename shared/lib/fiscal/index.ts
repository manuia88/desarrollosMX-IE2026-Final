import { ARAfipGenerator } from './ar-afip';
import { BRNfsGenerator } from './br-nfs';
import { CLSiiGenerator } from './cl-sii';
import { CODianGenerator } from './co-dian';
import type { FiscalDocGenerator } from './generator';
import { MXFacturapiGenerator } from './mx-facturapi';

export { ARAfipGenerator } from './ar-afip';
export { BRNfsGenerator } from './br-nfs';
export { CLSiiGenerator } from './cl-sii';
export { CODianGenerator } from './co-dian';
export type {
  FiscalDocGenerator,
  FiscalDocStatus,
  InvoiceInput,
  InvoiceLine,
} from './generator';
export { NotImplementedFiscalError } from './generator';
export { MXFacturapiGenerator } from './mx-facturapi';

export function getFiscalGenerator(country: string): FiscalDocGenerator {
  switch (country) {
    case 'MX':
      return new MXFacturapiGenerator();
    case 'CO':
      return new CODianGenerator();
    case 'AR':
      return new ARAfipGenerator();
    case 'BR':
      return new BRNfsGenerator();
    case 'CL':
      return new CLSiiGenerator();
    default:
      throw new Error(`No fiscal generator for ${country}`);
  }
}
