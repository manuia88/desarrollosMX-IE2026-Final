// AVM MVP I01 DMX Estimate — schemas Zod shared (Single Source of Truth).
// Ref: FASE_08 §BLOQUE 8.D.3 + 03.8 §I01 + regla 1 CLAUDE.md.
// Input + response validation para /api/v1/estimate.

import { z } from 'zod';

const tipoPropiedadSchema = z.enum(['depto', 'casa', 'townhouse', 'studio']);
const orientacionSchema = z.enum(['N', 'S', 'E', 'O']);
const estadoConservacionSchema = z.enum(['nuevo', 'excelente', 'bueno', 'regular', 'obra_gris']);

export const estimateRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  sup_m2: z.number().positive().max(5000),
  recamaras: z.number().int().min(0).max(15),
  banos: z.number().min(0).max(15),
  amenidades: z.array(z.string().max(80)).max(50),
  estado_conservacion: estadoConservacionSchema,
  tipo_propiedad: tipoPropiedadSchema,
  sup_terreno_m2: z.number().positive().max(20000).optional(),
  medio_banos: z.number().int().min(0).max(10).optional(),
  estacionamientos: z.number().int().min(0).max(20).optional(),
  edad_anos: z.number().int().min(0).max(200).optional(),
  piso: z.number().int().min(0).max(100).optional(),
  condiciones: z
    .object({
      roof_garden: z.boolean().optional(),
      orientacion: orientacionSchema.optional(),
      vista_parque: z.boolean().optional(),
      amenidades_premium_count: z.number().int().min(0).max(50).optional(),
      anos_escritura: z.number().int().min(0).max(200).optional(),
      seguridad_interna: z.boolean().optional(),
      mascotas_ok: z.boolean().optional(),
    })
    .optional(),
});

export type EstimateRequest = z.infer<typeof estimateRequestSchema>;

const adjustmentSchema = z.object({
  feature: z.string(),
  value_pct: z.number(),
  source: z.enum(['regression_coefficient', 'comparable_overlay', 'market_context']),
  weight: z.number(),
  confidence: z.enum(['high', 'medium', 'low']),
  explanation_i18n_key: z.string(),
});

const comparableSchema = z.object({
  id: z.string(),
  distance_m: z.number().nonnegative(),
  similarity_score: z.number().min(0).max(1),
  price_m2: z.number().positive(),
});

const marketContextSchema = z.object({
  precio_m2_zona_p50: z.number().nullable(),
  absorcion_12m: z.number().nullable(),
  momentum_n11: z.number().nullable(),
  last_data_update: z.string().nullable(),
});

const methodologySchema = z.object({
  formula: z.string(),
  sources: z.array(z.string()),
  weights: z.record(z.string(), z.number()),
  references: z.array(z.object({ name: z.string(), url: z.string() })),
  validity: z.object({
    unit: z.enum(['hours', 'days', 'months']),
    value: z.number(),
  }),
});

const citationSchema = z.object({
  source: z.string(),
  url: z.string().optional(),
  accessed_at: z.string().optional(),
});

export const estimateResponseSchema = z.object({
  estimate: z.number().positive(),
  ci_low: z.number().positive(),
  ci_high: z.number().positive(),
  confidence_score: z.number().int().min(0).max(100),
  mae_estimated_pct: z.number().nonnegative(),
  estimate_alternative: z.number().positive().nullable(),
  spread_pct: z.number().nonnegative().nullable(),
  flag_uncertain: z.boolean(),
  flag_corroborated: z.boolean(),
  score_label_key: z.string(),
  adjustments: z.array(adjustmentSchema),
  comparables: z.array(comparableSchema),
  market_context: marketContextSchema,
  methodology: methodologySchema,
  model_version: z.string(),
  endpoint_version: z.string(),
  valid_until: z.string(),
  cached: z.boolean(),
  computed_at: z.string(),
  citations: z.array(citationSchema),
});

export type EstimateResponse = z.infer<typeof estimateResponseSchema>;

export const estimateErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

export type EstimateError = z.infer<typeof estimateErrorSchema>;
