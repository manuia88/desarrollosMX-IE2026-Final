// STR Reports Data Assembler — FASE 07b / BLOQUE 7b.N.
//
// Assembler puro que construye el payload data-only para los 4 tiers de
// STR Intelligence Reports. El PDF rendering (vía @react-pdf/renderer en
// Vercel function) consume este payload y produce el archivo final.
//
// Tiers:
//   1 (Individual Owner): 1 listing/dirección, 8-12 páginas — viability +
//     pricing + comparables.
//   2 (Alcaldía): 1 alcaldía/municipio, 20-30 páginas — ZIS + invisible
//     hotels + nomad + trends.
//   3 (Gobierno CDMX): ciudad completa, 60-90 páginas — anual + quarterly
//     addenda, compliance-ready.
//   4 (API Broker): no PDF — schema OpenAPI accesible vía endpoints.
//
// Cada assembler recibe el scope necesario y retorna `ReportPayload`
// listo para serialización JSON o pasado al renderer.

export type ReportTier = 1 | 2 | 3 | 4;

export interface ReportScope {
  readonly tier: ReportTier;
  readonly country_code: string;
  readonly market_id?: string;
  readonly listing_id?: string;
  readonly alcaldia_name?: string;
  readonly period_start?: string;
  readonly period_end?: string;
}

export interface ReportSection {
  readonly title: string;
  readonly type: 'summary' | 'table' | 'chart' | 'narrative' | 'methodology';
  readonly content: unknown;
}

export interface ReportPayload {
  readonly tier: ReportTier;
  readonly title: string;
  readonly scope: ReportScope;
  readonly generated_at: string;
  readonly methodology_url: string;
  readonly disclaimer: string;
  readonly sections: readonly ReportSection[];
  readonly compliance: {
    readonly lfpdppp_compliant: boolean;
    readonly data_subject_rights_url: string;
  };
}

const METHODOLOGY_URL = '/metodologia/str';
const DSR_URL = '/legal/data-subject-rights';
const DEFAULT_DISCLAIMER =
  'Reporte generado a partir de datos de terceros (AirROI) y modelos propietarios DesarrollosMX. ' +
  'Las proyecciones son estimaciones y no constituyen asesoría financiera ni garantía de resultados. ' +
  'Verificar metodología en /metodologia/str.';

export interface Tier1Inputs {
  readonly viability: {
    readonly cap_rate: number;
    readonly breakeven_months: number;
    readonly net_revenue_annual_minor: number;
  };
  readonly comparables_count: number;
  readonly pricing_advisor_summary: {
    readonly avg_suggested_price_minor: number;
    readonly peak_event_count: number;
  };
  readonly listing_metadata: {
    readonly listing_id: string;
    readonly bedrooms: number | null;
    readonly capacity: number | null;
  };
}

export function assembleTier1IndividualOwner(
  scope: ReportScope,
  inputs: Tier1Inputs,
): ReportPayload {
  if (scope.tier !== 1) throw new Error('tier_mismatch');
  return {
    tier: 1,
    title: `STR Investment Report — Individual Owner (${inputs.listing_metadata.listing_id})`,
    scope,
    generated_at: new Date().toISOString(),
    methodology_url: METHODOLOGY_URL,
    disclaimer: DEFAULT_DISCLAIMER,
    sections: [
      {
        title: 'Resumen ejecutivo',
        type: 'summary',
        content: {
          cap_rate: inputs.viability.cap_rate,
          breakeven_months: inputs.viability.breakeven_months,
          net_revenue_annual_minor: inputs.viability.net_revenue_annual_minor,
        },
      },
      {
        title: 'Viabilidad de inversión',
        type: 'table',
        content: inputs.viability,
      },
      {
        title: 'Comparables',
        type: 'narrative',
        content: { comparables_count: inputs.comparables_count },
      },
      {
        title: 'Pricing Advisor (90 días)',
        type: 'chart',
        content: inputs.pricing_advisor_summary,
      },
      {
        title: 'Metodología',
        type: 'methodology',
        content: { url: METHODOLOGY_URL },
      },
    ],
    compliance: {
      lfpdppp_compliant: true,
      data_subject_rights_url: DSR_URL,
    },
  };
}

export interface Tier2Inputs {
  readonly zis_summary: {
    readonly score: number;
    readonly confidence: string;
  };
  readonly invisible_hotels: {
    readonly clusters_count: number;
    readonly listings_in_clusters: number;
  };
  readonly nomad_demand_score: number;
  readonly active_listings_count: number;
}

export function assembleTier2Alcaldia(scope: ReportScope, inputs: Tier2Inputs): ReportPayload {
  if (scope.tier !== 2) throw new Error('tier_mismatch');
  if (!scope.alcaldia_name) throw new Error('tier2_missing_alcaldia_name');
  return {
    tier: 2,
    title: `STR Intelligence Report — ${scope.alcaldia_name}`,
    scope,
    generated_at: new Date().toISOString(),
    methodology_url: METHODOLOGY_URL,
    disclaimer: DEFAULT_DISCLAIMER,
    sections: [
      {
        title: 'Resumen — Zone Investment Score',
        type: 'summary',
        content: inputs.zis_summary,
      },
      {
        title: 'Invisible Hotels detectados',
        type: 'table',
        content: inputs.invisible_hotels,
      },
      {
        title: 'Nomad Flow Analytics',
        type: 'chart',
        content: { score: inputs.nomad_demand_score },
      },
      {
        title: 'Mercado activo',
        type: 'narrative',
        content: { active_listings_count: inputs.active_listings_count },
      },
      {
        title: 'Metodología',
        type: 'methodology',
        content: { url: METHODOLOGY_URL },
      },
    ],
    compliance: {
      lfpdppp_compliant: true,
      data_subject_rights_url: DSR_URL,
    },
  };
}

export interface Tier3Inputs {
  readonly city_zis_avg: number;
  readonly invisible_hotels_total: number;
  readonly migration_alerts_count: number;
  readonly env_score_avg: number;
  readonly nomad_score_avg: number;
  readonly markets_covered: number;
  readonly quarterly_addenda: readonly { quarter: string; highlights: string }[];
}

export function assembleTier3GovCDMX(scope: ReportScope, inputs: Tier3Inputs): ReportPayload {
  if (scope.tier !== 3) throw new Error('tier_mismatch');
  return {
    tier: 3,
    title: 'STR Intelligence Annual Report — Gobierno CDMX',
    scope,
    generated_at: new Date().toISOString(),
    methodology_url: METHODOLOGY_URL,
    disclaimer: DEFAULT_DISCLAIMER,
    sections: [
      {
        title: 'Resumen ciudad',
        type: 'summary',
        content: {
          city_zis_avg: inputs.city_zis_avg,
          markets_covered: inputs.markets_covered,
        },
      },
      {
        title: 'Hoteles invisibles — total CDMX',
        type: 'table',
        content: { total: inputs.invisible_hotels_total },
      },
      {
        title: 'Migration alerts',
        type: 'table',
        content: { count: inputs.migration_alerts_count },
      },
      {
        title: 'Calidad ambiental ENV (avg)',
        type: 'summary',
        content: { score: inputs.env_score_avg },
      },
      {
        title: 'Nomad Flow (avg)',
        type: 'summary',
        content: { score: inputs.nomad_score_avg },
      },
      {
        title: 'Adenda Trimestral',
        type: 'narrative',
        content: { quarters: inputs.quarterly_addenda },
      },
      {
        title: 'Metodología y Compliance LFPDPPP',
        type: 'methodology',
        content: { url: METHODOLOGY_URL, dsr_url: DSR_URL },
      },
    ],
    compliance: {
      lfpdppp_compliant: true,
      data_subject_rights_url: DSR_URL,
    },
  };
}

export interface Tier4Inputs {
  readonly api_endpoints: readonly string[];
  readonly rate_limit_per_minute: number;
  readonly bearer_token_required: boolean;
}

export function assembleTier4ApiAccess(scope: ReportScope, inputs: Tier4Inputs): ReportPayload {
  if (scope.tier !== 4) throw new Error('tier_mismatch');
  return {
    tier: 4,
    title: 'STR API Access Bundle',
    scope,
    generated_at: new Date().toISOString(),
    methodology_url: METHODOLOGY_URL,
    disclaimer:
      'Acceso programático a STR Intelligence vía API REST. SLA best-effort durante incidents de proveedores. ' +
      DEFAULT_DISCLAIMER,
    sections: [
      {
        title: 'Endpoints disponibles',
        type: 'table',
        content: { endpoints: inputs.api_endpoints },
      },
      {
        title: 'Rate limit + Auth',
        type: 'summary',
        content: {
          rate_limit_per_minute: inputs.rate_limit_per_minute,
          bearer_token_required: inputs.bearer_token_required,
        },
      },
      {
        title: 'Metodología',
        type: 'methodology',
        content: { url: METHODOLOGY_URL },
      },
    ],
    compliance: {
      lfpdppp_compliant: true,
      data_subject_rights_url: DSR_URL,
    },
  };
}
