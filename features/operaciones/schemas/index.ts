import { z } from 'zod';

export * from './contracts';

export const OPERACION_SIDE = ['ambos', 'comprador', 'vendedor'] as const;
export const operacionSideEnum = z.enum(OPERACION_SIDE);
export type OperacionSide = z.infer<typeof operacionSideEnum>;

export const OPERACION_STATUS = [
  'propuesta',
  'oferta_aceptada',
  'escritura',
  'cerrada',
  'pagando',
  'cancelada',
] as const;
export const operacionStatusEnum = z.enum(OPERACION_STATUS);
export type OperacionStatus = z.infer<typeof operacionStatusEnum>;

export const OPERACION_PROPIEDAD_TYPE = ['proyecto', 'unidad', 'propiedad_secundaria'] as const;
export const propiedadTypeEnum = z.enum(OPERACION_PROPIEDAD_TYPE);
export type PropiedadType = z.infer<typeof propiedadTypeEnum>;

export const OPERACION_CURRENCY = ['MXN', 'USD', 'COP', 'ARS', 'BRL'] as const;
export const operacionCurrencyEnum = z.enum(OPERACION_CURRENCY);
export type OperacionCurrency = z.infer<typeof operacionCurrencyEnum>;

export const OPERACION_PART_ROLE = [
  'comprador',
  'vendedor',
  'asesor_comprador',
  'asesor_vendedor',
  'asesor_productor',
  'propietario',
] as const;
export const operacionPartRoleEnum = z.enum(OPERACION_PART_ROLE);
export type OperacionPartRole = z.infer<typeof operacionPartRoleEnum>;

export const OPERACION_PAGO_ESTADO = ['pending', 'paid', 'closed', 'expired'] as const;
export const operacionPagoEstadoEnum = z.enum(OPERACION_PAGO_ESTADO);
export type OperacionPagoEstado = z.infer<typeof operacionPagoEstadoEnum>;

export const OPERACION_ATTACHMENT_TIPO = [
  'factura',
  'comprobante_pago',
  'contrato',
  'cfdi_pdf',
  'cfdi_xml',
  'otro',
] as const;
export const operacionAttachmentTipoEnum = z.enum(OPERACION_ATTACHMENT_TIPO);
export type OperacionAttachmentTipo = z.infer<typeof operacionAttachmentTipoEnum>;

export const COUNTRY_CODES = ['MX', 'CO', 'AR', 'BR', 'US'] as const;
export const countryCodeEnum = z.enum(COUNTRY_CODES);

const optionalUuid = z.string().uuid().optional();
const optionalCurrency = operacionCurrencyEnum.optional();
const optionalAmount = z.number().nonnegative().optional();

export const wizardCompradorSchema = z.object({
  asesorId: z.string().uuid(),
  contactoId: z.string().uuid(),
});
export type WizardComprador = z.infer<typeof wizardCompradorSchema>;

export const wizardVendedorSchema = z.object({
  propiedadType: propiedadTypeEnum,
  propiedadId: z.string().uuid(),
  asesorProductorId: optionalUuid,
  asesorVendedorId: z.string().uuid(),
  propietarioContactoId: z.string().uuid(),
});
export type WizardVendedor = z.infer<typeof wizardVendedorSchema>;

export const wizardEstadoSchema = z
  .object({
    status: operacionStatusEnum.default('propuesta'),
    fechaCierre: z.string().date(),
    reservaAmount: optionalAmount,
    reservaCurrency: optionalCurrency,
    promocionAmount: optionalAmount,
    promocionCurrency: optionalCurrency,
    cierreAmount: z.number().positive(),
    cierreCurrency: operacionCurrencyEnum,
    fxRate: z.number().positive().optional(),
    fxRateDate: z.string().date().optional(),
  })
  .refine(
    (data) =>
      data.reservaAmount === undefined ||
      data.reservaAmount === 0 ||
      data.reservaCurrency !== undefined,
    { message: 'reservaCurrency requerido cuando reservaAmount > 0', path: ['reservaCurrency'] },
  )
  .refine(
    (data) =>
      data.promocionAmount === undefined ||
      data.promocionAmount === 0 ||
      data.promocionCurrency !== undefined,
    {
      message: 'promocionCurrency requerido cuando promocionAmount > 0',
      path: ['promocionCurrency'],
    },
  );
export type WizardEstado = z.infer<typeof wizardEstadoSchema>;

export const wizardComisionSchema = z.object({
  comisionPct: z.number().min(0.25).max(20).default(4),
  ivaPct: z.number().min(0).max(100).default(16),
  splitDmxPct: z.number().min(0).max(100).default(20),
  declaracionJurada: z.literal(true),
  facturaAttachmentId: optionalUuid,
});
export type WizardComision = z.infer<typeof wizardComisionSchema>;

export const wizardNotasSchema = z.object({
  notas: z.string().max(5000).optional(),
  attachmentIds: z.array(z.string().uuid()).max(10).default([]),
});
export type WizardNotas = z.infer<typeof wizardNotasSchema>;

export const createOperacionInput = z.object({
  countryCode: countryCodeEnum,
  side: operacionSideEnum,
  comprador: wizardCompradorSchema,
  vendedor: wizardVendedorSchema,
  estado: wizardEstadoSchema,
  comision: wizardComisionSchema,
  notas: wizardNotasSchema,
});
export type CreateOperacionInput = z.infer<typeof createOperacionInput>;

export const listOperacionesInput = z.object({
  status: operacionStatusEnum.optional(),
  side: operacionSideEnum.optional(),
  currency: operacionCurrencyEnum.optional(),
  fechaCierreFrom: z.string().date().optional(),
  fechaCierreTo: z.string().date().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
export type ListOperacionesInput = z.infer<typeof listOperacionesInput>;

export const getOperacionByIdInput = z.object({
  id: z.string().uuid(),
});
export type GetOperacionByIdInput = z.infer<typeof getOperacionByIdInput>;

export const updateOperacionStatusInput = z
  .object({
    id: z.string().uuid(),
    newStatus: operacionStatusEnum,
    motivo: z.string().min(10).max(500).optional(),
    firmaSimple: z.boolean().optional(),
    legalFlowInitiated: z.boolean().optional(),
    mifielCompleted: z.boolean().optional(),
  })
  .refine((data) => data.newStatus !== 'cancelada' || (data.motivo && data.motivo.length >= 10), {
    message: 'motivo obligatorio (≥10 chars) para cancelar',
    path: ['motivo'],
  });
export type UpdateOperacionStatusInput = z.infer<typeof updateOperacionStatusInput>;

export const cancelOperacionInput = z.object({
  id: z.string().uuid(),
  motivo: z.string().min(10).max(500),
});
export type CancelOperacionInput = z.infer<typeof cancelOperacionInput>;

export const registerPagoInput = z.object({
  operacionId: z.string().uuid(),
  amount: z.number().positive(),
  currency: operacionCurrencyEnum,
  fechaPago: z.string().date(),
  estadoPago: operacionPagoEstadoEnum.default('pending'),
  comprobanteAttachmentId: optionalUuid,
  notes: z.string().max(1000).optional(),
});
export type RegisterPagoInput = z.infer<typeof registerPagoInput>;

export const parsePegarLigaInput = z.object({
  url: z.string().url(),
});
export type ParsePegarLigaInput = z.infer<typeof parsePegarLigaInput>;

export const emitCFDIInput = z.object({
  operacionId: z.string().uuid(),
});
export type EmitCFDIInput = z.infer<typeof emitCFDIInput>;

export const STATUS_TRANSITIONS: Record<OperacionStatus, ReadonlyArray<OperacionStatus>> = {
  propuesta: ['oferta_aceptada', 'cancelada'],
  oferta_aceptada: ['escritura', 'cancelada'],
  escritura: ['cerrada', 'cancelada'],
  cerrada: ['pagando', 'cancelada'],
  pagando: ['cerrada'],
  cancelada: [],
};

export const STATUS_COMPLETION_PCT: Record<OperacionStatus, number> = {
  propuesta: 15,
  oferta_aceptada: 35,
  escritura: 60,
  cerrada: 85,
  pagando: 95,
  cancelada: 0,
};

export function isStatusTransitionValid(from: OperacionStatus, to: OperacionStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}
