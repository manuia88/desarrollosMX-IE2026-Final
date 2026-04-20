// H03 Seismic Risk — riesgo sísmico inverso (mayor score = más seguro) basado en
// Atlas de Riesgos CDMX microzonificación AGEB (I/II/IIIa/IIIb/IIIc/IIId).
// Plan 8.B.10. Catálogo 03.8 §H03.
//
// Mapeo zonificación CDMX → score base:
//   I    = 100 (lomas firmes, roca)
//   II   = 75  (transición)
//   IIIa = 55  (lago, amp media-baja)
//   IIIb = 40  (lago, amp media)
//   IIIc = 25  (lago, amp alta) — riesgo alto
//   IIId = 10  (lago, amp muy alta) — riesgo muy alto
//
// Modificadores:
//   amplificacion_onda: baja +0, media −5, alta −10
//   licuacion_riesgo: bajo +0, medio −5, alto −15

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AtlasAmplificacion,
  AtlasLicuacion,
  AtlasZonaGeotecnica,
} from '../../__fixtures__/cdmx-zones';
import type { Calculator, CalculatorInput, CalculatorOutput, Confidence } from '../base';

export const version = '1.0.0';

export const methodology = {
  formula:
    'base_por_zona (I=100, II=75, IIIa=55, IIIb=40, IIIc=25, IIId=10) + modificadores amplificacion_onda y licuacion_riesgo',
  sources: ['atlas_riesgos'],
  weights: {
    base_zona: 100,
    amplificacion_onda: -10,
    licuacion_riesgo: -15,
  },
  references: [
    {
      name: 'Atlas de Riesgos CDMX',
      url: 'https://www.atlas.cdmx.gob.mx/',
      period: 'shapefile_snapshot',
    },
  ],
  confidence_thresholds: { high: 1, medium: 0, low: 0 },
} as const;

export const reasoning_template =
  'Seismic Risk (inverso) de {zona_name} obtiene {score_value} en zona geotécnica {zona_geotecnica}, amplificación {amplificacion_onda}, licuación {licuacion_riesgo}. Score INVERSO: mayor = más seguro.';

const ZONA_BASE_SCORE: Record<AtlasZonaGeotecnica, number> = {
  I: 100,
  II: 75,
  IIIa: 55,
  IIIb: 40,
  IIIc: 25,
  IIId: 10,
};

const AMP_PENALTY: Record<AtlasAmplificacion, number> = {
  baja: 0,
  media: 5,
  alta: 10,
};

const LIC_PENALTY: Record<AtlasLicuacion, number> = {
  bajo: 0,
  medio: 5,
  alto: 15,
};

export interface H03Components extends Record<string, unknown> {
  readonly zona_geotecnica: AtlasZonaGeotecnica;
  readonly amplificacion_onda: AtlasAmplificacion;
  readonly licuacion_riesgo: AtlasLicuacion;
  readonly base_score: number;
  readonly amp_penalty: number;
  readonly lic_penalty: number;
}

export interface H03RawInput {
  readonly zona_geotecnica: AtlasZonaGeotecnica;
  readonly amplificacion_onda: AtlasAmplificacion;
  readonly licuacion_riesgo: AtlasLicuacion;
}

export interface H03ComputeResult {
  readonly value: number;
  readonly confidence: Confidence;
  readonly components: H03Components;
}

export function computeH03Seismic(input: H03RawInput): H03ComputeResult {
  const base_score = ZONA_BASE_SCORE[input.zona_geotecnica];
  const amp_penalty = AMP_PENALTY[input.amplificacion_onda];
  const lic_penalty = LIC_PENALTY[input.licuacion_riesgo];
  const value = Math.max(0, Math.min(100, Math.round(base_score - amp_penalty - lic_penalty)));

  // Atlas de Riesgos es shapefile polígono — cualquier AGEB es de alta confianza.
  const confidence: Confidence = 'high';

  return {
    value,
    confidence,
    components: {
      zona_geotecnica: input.zona_geotecnica,
      amplificacion_onda: input.amplificacion_onda,
      licuacion_riesgo: input.licuacion_riesgo,
      base_score,
      amp_penalty,
      lic_penalty,
    },
  };
}

export function getLabelKey(value: number, confidence: Confidence): string {
  if (confidence === 'insufficient_data') return 'ie.score.h03.insufficient';
  if (value >= 75) return 'ie.score.h03.bajo';
  if (value >= 50) return 'ie.score.h03.medio';
  if (value >= 25) return 'ie.score.h03.alto';
  return 'ie.score.h03.muy_alto';
}

export const h03SeismicRiskCalculator: Calculator = {
  scoreId: 'H03',
  version,
  tier: 1,
  async run(input: CalculatorInput, _supabase: SupabaseClient): Promise<CalculatorOutput> {
    const confidence: Confidence = 'insufficient_data';
    const computed_at = new Date().toISOString();
    return {
      score_value: 0,
      score_label: getLabelKey(0, confidence),
      components: { reason: 'Atlas Riesgos geo_data_points no ingested for zone' },
      inputs_used: { periodDate: input.periodDate, zoneId: input.zoneId ?? null },
      confidence,
      citations: [
        {
          source: 'atlas_riesgos',
          url: 'https://www.atlas.cdmx.gob.mx/',
          period: 'pending_ingest',
        },
      ],
      provenance: {
        sources: [{ name: 'atlas_riesgos', count: 0 }],
        computed_at,
        calculator_version: version,
      },
      template_vars: { zona_name: input.zoneId ?? 'desconocida' },
    };
  },
};

export default h03SeismicRiskCalculator;
