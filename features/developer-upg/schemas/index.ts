import { z } from 'zod';

export const upgProjectInput = z.object({
  proyectoId: z.string().uuid(),
});
export type UpgProjectInput = z.infer<typeof upgProjectInput>;

export const upgDemandHeatmapInput = z.object({
  proyectoId: z.string().uuid(),
  daysWindow: z.number().int().min(7).max(90).default(30),
});
export type UpgDemandHeatmapInput = z.infer<typeof upgDemandHeatmapInput>;

export const upgPricingAdvisorInput = z.object({
  proyectoId: z.string().uuid(),
});
export type UpgPricingAdvisorInput = z.infer<typeof upgPricingAdvisorInput>;

export const upgCompetitiveInput = z.object({
  proyectoId: z.string().uuid(),
});
export type UpgCompetitiveInput = z.infer<typeof upgCompetitiveInput>;

export const upgBenchmarkInput = z.object({
  desarrolladoraId: z.string().uuid(),
  periodQuarter: z.string().regex(/^\d{4}-Q[1-4]$/, 'expected_format_YYYY-QX'),
  countryCode: z.string().min(2).max(3).default('MX'),
});
export type UpgBenchmarkInput = z.infer<typeof upgBenchmarkInput>;

export const upgFeasibilityNewInput = z.object({
  catastroLink: z.string().url().nullable().optional(),
  geometryGeojson: z.unknown().nullable().optional(),
  programa: z.object({
    tipo: z.enum(['departamentos', 'casas', 'mixto', 'comercial']),
    unitsTotal: z.number().int().min(1).max(2000),
    precioPromedioMxn: z.number().positive(),
    costoTotalEstimateMxn: z.number().positive(),
    constructionMonths: z.number().int().min(6).max(60),
    absorcionMensual: z.number().positive(),
    discountRateAnnual: z.number().min(1).max(40).default(12),
    amortizacionTerrenoMensual: z.number().min(0).default(0),
    gastosFijosMensuales: z.number().min(0).default(0),
  }),
});
export type UpgFeasibilityNewInput = z.infer<typeof upgFeasibilityNewInput>;

export const upgFeasibilityListInput = z.object({
  desarrolladoraId: z.string().uuid().optional(),
});
export type UpgFeasibilityListInput = z.infer<typeof upgFeasibilityListInput>;

export const upgTerrenosListInput = z.object({
  countryCode: z.string().min(2).max(3).default('MX'),
  coloniaSlug: z.string().optional(),
  m2Min: z.number().int().min(0).optional(),
  m2Max: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type UpgTerrenosListInput = z.infer<typeof upgTerrenosListInput>;

export const upgManzanaInput = z.object({
  coloniaId: z.string().uuid().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type UpgManzanaInput = z.infer<typeof upgManzanaInput>;

export const upgOportunidadInput = z.object({
  countryCode: z.string().min(2).max(3).default('MX'),
  limit: z.number().int().min(1).max(50).default(20),
});
export type UpgOportunidadInput = z.infer<typeof upgOportunidadInput>;

export const upgProyeccionInput = z.object({
  coloniaId: z.string().uuid(),
});
export type UpgProyeccionInput = z.infer<typeof upgProyeccionInput>;
