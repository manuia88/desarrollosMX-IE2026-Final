import { z } from 'zod';
import { countryCodeEnum, currencyCodeEnum, moneyAmountSchema, uuidSchema } from './shared';

export const operacionTypeEnum = z.enum(['venta', 'renta', 'preventa', 'reventa']);
export type OperacionType = z.infer<typeof operacionTypeEnum>;

export const fiscalStatusEnum = z.enum(['pending', 'invoiced', 'paid']);
export type FiscalStatus = z.infer<typeof fiscalStatusEnum>;

export const operacionSchema = z.object({
  id: uuidSchema,
  deal_id: uuidSchema,
  operacion_type: operacionTypeEnum,
  amount: z.number().positive(),
  amount_currency: currencyCodeEnum,
  commission_amount: z.number().nonnegative(),
  commission_currency: currencyCodeEnum.nullable(),
  closed_at: z.string(),
  fiscal_status: fiscalStatusEnum,
  cfdi_uuid: z.string().nullable(),
  country_code: countryCodeEnum,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Operacion = z.infer<typeof operacionSchema>;

export const operacionCreateInput = z
  .object({
    deal_id: uuidSchema,
    operacion_type: operacionTypeEnum,
    amount: moneyAmountSchema,
    amount_currency: currencyCodeEnum,
    commission_amount: z.number().nonnegative().default(0),
    commission_currency: currencyCodeEnum.optional(),
    country_code: countryCodeEnum,
    closed_at: z.string().datetime().optional(),
  })
  .refine((data) => data.commission_amount === 0 || Boolean(data.commission_currency), {
    message: 'commission_currency_required_when_amount',
  });
export type OperacionCreateInput = z.infer<typeof operacionCreateInput>;

const cfdiUuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

export const operacionAttachCfdiInput = z.object({
  operacion_id: uuidSchema,
  cfdi_uuid: z.string().regex(cfdiUuidRegex, 'cfdi_uuid_format_invalid'),
});
export type OperacionAttachCfdiInput = z.infer<typeof operacionAttachCfdiInput>;

export const operacionListInput = z.object({
  fiscal_status: fiscalStatusEnum.optional(),
  country_code: countryCodeEnum.optional(),
  limit: z.number().int().min(1).max(200).default(50),
  cursor: uuidSchema.optional(),
});
export type OperacionListInput = z.infer<typeof operacionListInput>;
