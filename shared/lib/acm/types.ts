import { z } from 'zod';

export const acmTipoOperacionEnum = z.enum(['venta', 'renta']);
export type AcmTipoOperacion = z.infer<typeof acmTipoOperacionEnum>;

export const acmDiscProfileEnum = z.enum(['D', 'I', 'S', 'C']);
export type AcmDiscProfile = z.infer<typeof acmDiscProfileEnum>;

export const acmInputSchema = z.object({
  precioSolicitado: z.number().positive(),
  precioMedianaZona: z.number().positive().optional(),
  zoneId: z.string().uuid().nullable().optional(),
  zonePulseScore: z.number().min(0).max(1).optional(),
  amenidadesPropiedad: z.array(z.string().max(40)).max(40).default([]),
  amenidadesMedianaZona: z.array(z.string().max(40)).max(40).default([]),
  areaM2: z.number().nonnegative().optional(),
  areaMedianaZona: z.number().positive().optional(),
  discZonaScore: z.number().min(0).max(1).optional(),
  discProfile: acmDiscProfileEnum.optional(),
  tipoOperacion: acmTipoOperacionEnum,
});

export type AcmInput = z.infer<typeof acmInputSchema>;

export interface AcmBreakdown {
  priceFit: number;
  zoneScore: number;
  amenities: number;
  sizeFit: number;
  discZone: number;
}

export interface AcmResult {
  score: number;
  breakdown: AcmBreakdown;
  rationale: string[];
  weights: typeof ACM_WEIGHTS;
  inputsHash: string;
  computedAt: string;
  hasFallbackZoneScore: boolean;
}

export const ACM_WEIGHTS = {
  priceFit: 0.3,
  zoneScore: 0.25,
  amenities: 0.2,
  sizeFit: 0.15,
  discZone: 0.1,
} as const;
