import { z } from 'zod';

export const countryCodeEnum = z.enum(['MX', 'CO', 'AR', 'BR', 'US']);
export type CountryCode = z.infer<typeof countryCodeEnum>;

export const currencyCodeEnum = z.enum(['MXN', 'COP', 'ARS', 'BRL', 'USD']);
export type CurrencyCode = z.infer<typeof currencyCodeEnum>;

export const moneyAmountSchema = z.number().positive().max(999_999_999_999.99).multipleOf(0.01);

export const uuidSchema = z.string().uuid();
