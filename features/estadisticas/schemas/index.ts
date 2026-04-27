import { z } from 'zod';

export const ESTADISTICAS_PROPIEDAD_TIPO = [
  'departamento',
  'casa',
  'terreno',
  'oficina',
  'local',
] as const;
export const propiedadTipoEnum = z.enum(ESTADISTICAS_PROPIEDAD_TIPO);
export type PropiedadTipo = z.infer<typeof propiedadTipoEnum>;

const dateString = z.string().date();

const filtersSchema = z
  .object({
    colonia: z.string().max(80).optional(),
    tipo: propiedadTipoEnum.optional(),
    equipo: z.boolean().default(false),
  })
  .optional();

const dateRangeShape = {
  rangeFrom: dateString,
  rangeTo: dateString,
} as const;

export const estadisticasInput = z.object({
  ...dateRangeShape,
  filters: filtersSchema,
});
export type EstadisticasInput = z.infer<typeof estadisticasInput>;

export const metricsSemaforoInput = z.object(dateRangeShape);
export type MetricsSemaforoInput = z.infer<typeof metricsSemaforoInput>;

export const pipelineFunnelInput = z.object(dateRangeShape);
export type PipelineFunnelInput = z.infer<typeof pipelineFunnelInput>;

export const revenueByMonthInput = z.object(dateRangeShape);
export type RevenueByMonthInput = z.infer<typeof revenueByMonthInput>;

export const visitsConversionInput = z.object(dateRangeShape);
export type VisitsConversionInput = z.infer<typeof visitsConversionInput>;

export const zonesActivityInput = z.object(dateRangeShape);
export type ZonesActivityInput = z.infer<typeof zonesActivityInput>;

export const teamComparisonInput = z.object(dateRangeShape);
export type TeamComparisonInput = z.infer<typeof teamComparisonInput>;

export const leaderboardInput = z.object({
  month: dateString.optional(),
});
export type LeaderboardInput = z.infer<typeof leaderboardInput>;

export const semaforoTier = z.enum(['green', 'yellow', 'red']);
export type SemaforoTier = z.infer<typeof semaforoTier>;
