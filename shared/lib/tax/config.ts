export const TAX_CONFIG = {
  MX: {
    vat_rate: 0.16,
    vat_name: 'IVA',
    vat_zero_rated: ['medicinas', 'libros', 'alimentos_basicos'],
    withholding_isr_pct: 0.1,
    withholding_iva_pct: 0.1067,
    fiscal_regimes: ['601', '603', '612', '626'],
  },
  CO: {
    vat_rate: 0.19,
    vat_name: 'IVA',
    vat_reduced: 0.05,
    ica_range: [0.002, 0.014] as const,
    retencion_fuente_pct: 0.035,
    retencion_iva_pct: 0.15,
  },
  AR: {
    vat_rate: 0.21,
    vat_name: 'IVA',
    vat_reduced: 0.105,
    iibb_pct: 0.035,
    ganancias_pct: 0.35,
  },
  BR: {
    vat_name: 'ICMS/ISS/PIS/COFINS',
    icms_range: [0.07, 0.2] as const,
    iss_range: [0.02, 0.05] as const,
    pis_pct: 0.0165,
    cofins_pct: 0.076,
    irrf_pct: 0.015,
  },
  CL: {
    vat_rate: 0.19,
    vat_name: 'IVA',
    retencion_segunda_cat: 0.1075,
  },
  US: {
    vat_rate: null,
    sales_tax_state_varies: true,
    federal_income_tax_varies: true,
    state_sales_tax_range: [0, 0.1025] as const,
  },
} as const;

export type TaxCountry = keyof typeof TAX_CONFIG;
export type TaxType = 'vat' | 'iibb' | 'iss' | 'icms' | 'retencion' | 'sales_tax';

export function getTaxConfig(country: string): (typeof TAX_CONFIG)[TaxCountry] | null {
  return (TAX_CONFIG as Record<string, (typeof TAX_CONFIG)[TaxCountry]>)[country] ?? null;
}

export function calculateTax(amount: number, country: string, type: TaxType): number {
  const config = getTaxConfig(country);
  if (!config) return 0;

  switch (type) {
    case 'vat':
      if ('vat_rate' in config && typeof config.vat_rate === 'number') {
        return amount * config.vat_rate;
      }
      return 0;
    case 'iibb':
      if ('iibb_pct' in config) return amount * config.iibb_pct;
      return 0;
    case 'iss':
      if ('iss_range' in config) return amount * config.iss_range[0];
      return 0;
    case 'icms':
      if ('icms_range' in config) return amount * config.icms_range[0];
      return 0;
    case 'retencion':
      if ('retencion_fuente_pct' in config) return amount * config.retencion_fuente_pct;
      if ('withholding_isr_pct' in config) return amount * config.withholding_isr_pct;
      return 0;
    case 'sales_tax':
      if ('state_sales_tax_range' in config) return amount * config.state_sales_tax_range[0];
      return 0;
    default:
      return 0;
  }
}
