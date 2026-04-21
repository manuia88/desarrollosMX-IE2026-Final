// Shared contracts for the Scorecard Nacional feature (BLOQUE 11.I).
//
// Reporte trimestral definitivo "S&P + Banxico del real estate LATAM":
//   - PDF 40-80 páginas branded (portada + resumen ejecutivo + 15 rankings
//     top-20 + movilidad + sostenibilidad + metodología + disclaimer)
//   - Press Kit auto (comunicado 1-page + 3 quotes AI + 5 gráficas PNG)
//   - Landing público /scorecard-nacional con archivo histórico navegable
//   - Timeline Narrativo Causal 12m+ histórico por colonia
//   - Magnet vs Exodus ranking público (consumidor 11.G Migration Flow)
//   - Alpha Zone Lifecycle tracking (emerging → alpha → peaked → matured)
//
// Consumido por:
//   - features/scorecard-nacional/lib/* (pdf-generator, press-kit, timelines)
//   - app/(public)/scorecard-nacional/* (landing + archivo histórico)
//   - app/(public)/historia/[colonia]/page.tsx (timeline público SEO)
//   - app/(public)/indices/magnet-exodus/page.tsx (ranking interactivo)
//   - server/trpc/routers/scorecard-nacional.ts (public read procedures)
//
// Persiste en:
//   - public.scorecard_national_reports (tabla existente — migration
//     20260421100000 FASE 11 XL, RLS public_read cuando published_at is not null)
//   - Supabase Storage bucket `reports/scorecard/YYYY-QN.pdf` + press-kit/*.png

export type ScorecardScopeType = 'national';
export type ScorecardPeriodType = 'monthly' | 'quarterly' | 'annual';

// ---------------- Scorecard report header ----------------

// Row de public.scorecard_national_reports.
export interface ScorecardNationalReportRow {
  readonly id: string;
  readonly report_id: string; // e.g. "MX-2026-Q1"
  readonly period_type: ScorecardPeriodType;
  readonly period_date: string; // YYYY-MM-DD inicio de período
  readonly country_code: string;
  readonly pdf_url: string | null;
  readonly narrative_md: string | null;
  readonly data_snapshot: Record<string, unknown>;
  readonly published_at: string | null;
  readonly hero_insights: readonly unknown[];
  readonly press_kit_url: string | null;
  readonly created_at: string;
}

// Formato canónico report_id (XX-YYYY-QN, XX-YYYY-MNN, XX-YYYY-A).
export function buildReportId(
  countryCode: string,
  periodType: ScorecardPeriodType,
  periodDate: string,
): string {
  const year = periodDate.slice(0, 4);
  if (periodType === 'annual') return `${countryCode}-${year}-A`;
  const monthNum = Number(periodDate.slice(5, 7));
  if (periodType === 'quarterly') {
    const q = Math.floor((monthNum - 1) / 3) + 1;
    return `${countryCode}-${year}-Q${q}`;
  }
  return `${countryCode}-${year}-M${String(monthNum).padStart(2, '0')}`;
}

// ---------------- Hero insight (card destacada en PDF / landing) ----------------

export type HeroInsightKind =
  | 'pulse_national'
  | 'top_magnet'
  | 'top_exodus'
  | 'alpha_emerging'
  | 'sustainability_leader'
  | 'ipv_mover';

export interface HeroInsight {
  readonly kind: HeroInsightKind;
  readonly zone_id: string | null;
  readonly zone_label: string;
  readonly headline: string;
  readonly value: number | null;
  readonly delta: number | null;
  readonly unit: 'score_0_100' | 'pct' | 'count' | 'absolute';
}

// ---------------- Pulse Hero ----------------

export interface PulseHeroMetric {
  readonly country_code: string;
  readonly period_date: string;
  readonly pulse_national: number; // 0..100
  readonly delta_vs_previous: number | null;
  readonly top_zones: readonly {
    readonly zone_id: string;
    readonly zone_label: string;
    readonly pulse: number;
    readonly delta: number | null;
  }[];
  readonly bottom_zones: readonly {
    readonly zone_id: string;
    readonly zone_label: string;
    readonly pulse: number;
    readonly delta: number | null;
  }[];
}

// ---------------- Magnet vs Exodus ----------------

export type MagnetExodusTier = 'magnet' | 'exodus' | 'neutral';

export interface MagnetExodusRow {
  readonly zone_id: string;
  readonly zone_label: string;
  readonly scope_type: 'colonia' | 'alcaldia';
  readonly country_code: string;
  readonly period_date: string;
  readonly inflow: number;
  readonly outflow: number;
  readonly net_flow: number;
  readonly net_flow_pct: number; // net_flow / (inflow+outflow)
  readonly tier: MagnetExodusTier;
  readonly rank: number;
}

export interface MagnetExodusRanking {
  readonly country_code: string;
  readonly period_date: string;
  readonly top_magnets: readonly MagnetExodusRow[]; // top 10 inflow neto
  readonly top_exodus: readonly MagnetExodusRow[]; // top 10 outflow neto
  readonly prose_md: string | null; // Forbes-style auto-narrative
}

// ---------------- Alpha Lifecycle ----------------

export type AlphaLifecycleState = 'emerging' | 'alpha' | 'peaked' | 'matured' | 'declining';

export interface AlphaLifecycleTransition {
  readonly zone_id: string;
  readonly zone_label: string;
  readonly from_state: AlphaLifecycleState | null;
  readonly to_state: AlphaLifecycleState;
  readonly detected_at: string;
  readonly alpha_score_at_transition: number | null;
}

export interface AlphaLifecycleCaseStudy {
  readonly zone_id: string;
  readonly zone_label: string;
  readonly current_state: AlphaLifecycleState;
  readonly years_in_state: number;
  readonly signature_signals: readonly string[]; // e.g. ['chef early movers', 'specialty cafes']
  readonly story_md: string; // narrative Causal Engine generated
  readonly timeline: readonly AlphaLifecycleTransition[];
}

export interface AlphaLifecycleSummary {
  readonly country_code: string;
  readonly period_date: string;
  readonly counts_by_state: Readonly<Record<AlphaLifecycleState, number>>;
  readonly transitions_this_period: readonly AlphaLifecycleTransition[];
  readonly case_studies: readonly AlphaLifecycleCaseStudy[]; // 3-5 destacados
}

// ---------------- Causal Timeline (Historia Colonia) ----------------

export interface CausalTimelineEntry {
  readonly zone_id: string;
  readonly zone_label: string;
  readonly period_date: string;
  readonly metric_id: string; // e.g. 'DMX-IPV', 'PULSE'
  readonly value: number | null;
  readonly delta: number | null;
  readonly explanation_md: string;
  readonly citations: readonly string[];
}

export interface CausalTimelineBundle {
  readonly zone_id: string;
  readonly zone_label: string;
  readonly country_code: string;
  readonly months_covered: number;
  readonly entries: readonly CausalTimelineEntry[];
  readonly narrative_md: string; // relato continuo 1-2 párrafos
  readonly alpha_journey_md: string | null; // UPGRADE L114 si es alpha zone
}

// ---------------- Sustainability National ----------------

export interface SustainabilityNationalSection {
  readonly country_code: string;
  readonly period_date: string;
  readonly ids_national: number | null; // IDS avg
  readonly ire_national: number | null;
  readonly igv_national: number | null; // GRN agregado nacional
  readonly grn_national: number | null;
  readonly ranking_ids: readonly ScorecardRankingEntry[]; // top 10 IDS
  readonly ranking_ire: readonly ScorecardRankingEntry[];
  readonly ranking_grn: readonly ScorecardRankingEntry[];
  readonly narrative_md: string;
}

// ---------------- Rankings genéricos (PDF sections) ----------------

export interface ScorecardRankingEntry {
  readonly rank: number;
  readonly zone_id: string;
  readonly zone_label: string;
  readonly scope_type: 'colonia' | 'alcaldia' | 'city' | 'estado';
  readonly value: number;
  readonly delta_vs_previous: number | null;
  readonly trend_direction: 'mejorando' | 'estable' | 'empeorando' | null;
}

export interface ScorecardRankingSection {
  readonly index_code: string; // e.g. 'IPV', 'IAB', 'IDS', 'GNT'
  readonly index_label: string;
  readonly top_20: readonly ScorecardRankingEntry[];
  readonly methodology_url: string;
}

// ---------------- Executive narrative ----------------

export interface ExecutiveNarrativeSection {
  readonly title: string;
  readonly body_md: string;
  readonly citations: readonly string[];
}

export interface ExecutiveNarrative {
  readonly country_code: string;
  readonly period_date: string;
  readonly summary_md: string; // 2-page executive summary
  readonly zone_stories: readonly {
    readonly zone_id: string;
    readonly zone_label: string;
    readonly story_md: string;
  }[]; // top 5 zone stories
  readonly generated_at: string;
}

// ---------------- Press Kit ----------------

export interface PressKitQuote {
  readonly attribution: string; // e.g. "Dr. Manuel Acosta, Head of Research DMX"
  readonly quote_md: string;
}

export interface PressKitChart {
  readonly slug: string; // e.g. "pulse-national-trend"
  readonly title: string;
  readonly png_url: string;
  readonly width: number;
  readonly height: number;
}

export interface PressKitBundle {
  readonly report_id: string;
  readonly country_code: string;
  readonly period_date: string;
  readonly release_md: string; // comunicado 1-page
  readonly release_pdf_url: string | null;
  readonly quotes: readonly PressKitQuote[]; // exactly 3
  readonly charts: readonly PressKitChart[]; // exactly 5
  readonly published_url: string | null; // /press/scorecard-YYYY-QN
  readonly generated_at: string;
}

// ---------------- Scorecard complete bundle (all sections) ----------------

export interface ScorecardBundle {
  readonly report_id: string;
  readonly country_code: string;
  readonly period_type: ScorecardPeriodType;
  readonly period_date: string;
  readonly hero_insights: readonly HeroInsight[];
  readonly pulse_hero: PulseHeroMetric;
  readonly executive_narrative: ExecutiveNarrative;
  readonly sustainability: SustainabilityNationalSection;
  readonly rankings: readonly ScorecardRankingSection[]; // 15 indices
  readonly magnet_exodus: MagnetExodusRanking;
  readonly alpha_lifecycle: AlphaLifecycleSummary;
  readonly top_timelines: readonly CausalTimelineBundle[]; // top 5 "Historias del Trimestre"
  readonly methodology_version: string;
  readonly generated_at: string;
}

// ---------------- Public teaser (landing archive) ----------------

export interface ScorecardArchiveEntry {
  readonly report_id: string;
  readonly period_type: ScorecardPeriodType;
  readonly period_date: string;
  readonly country_code: string;
  readonly published_at: string;
  readonly pdf_url: string | null;
  readonly press_kit_url: string | null;
  readonly hero_headline: string | null;
  readonly pulse_national: number | null;
}
