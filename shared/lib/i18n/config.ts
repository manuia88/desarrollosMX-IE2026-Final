export const locales = ['es-MX', 'es-CO', 'es-AR', 'pt-BR', 'en-US'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es-MX';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeToCountry: Record<Locale, string> = {
  'es-MX': 'MX',
  'es-CO': 'CO',
  'es-AR': 'AR',
  'pt-BR': 'BR',
  'en-US': 'US',
};

export const COUNTRY_DEFAULT_CURRENCY: Record<string, string> = {
  MX: 'MXN',
  CO: 'COP',
  AR: 'ARS',
  BR: 'BRL',
  US: 'USD',
  CL: 'CLP',
};

export const COUNTRY_DEFAULT_TIMEZONE: Record<string, string> = {
  MX: 'America/Mexico_City',
  CO: 'America/Bogota',
  AR: 'America/Argentina/Buenos_Aires',
  BR: 'America/Sao_Paulo',
  US: 'America/New_York',
  CL: 'America/Santiago',
};

export const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  MX: 'es-MX',
  CO: 'es-CO',
  AR: 'es-AR',
  BR: 'pt-BR',
  US: 'en-US',
};
