import { format as dfFormat } from 'date-fns';
import { enUS, es, ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import type { Locale } from './config';

type DateFnsLocale = typeof es;

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  'es-MX': es,
  'es-CO': es,
  'es-AR': es,
  'pt-BR': ptBR,
  'en-US': enUS,
};

function resolveDateFnsLocale(locale: string): DateFnsLocale {
  return DATE_FNS_LOCALES[locale as Locale] ?? es;
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(
  date: Date | string | number,
  locale: string,
  pattern: string = 'PP',
  timezone?: string,
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const dfLocale = resolveDateFnsLocale(locale);
  if (timezone) {
    return formatInTimeZone(d, timezone, pattern, { locale: dfLocale });
  }
  return dfFormat(d, pattern, { locale: dfLocale });
}

type RelativeUnit = [Intl.RelativeTimeFormatUnit, number];

const RELATIVE_UNITS: RelativeUnit[] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

export function formatRelativeTime(date: Date | string | number, locale: string): string {
  const target = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const diffSeconds = (target.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds || unit === 'second') {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return rtf.format(0, 'second');
}

export function formatAddress(
  parts: { street?: string; city?: string; state?: string; postal_code?: string; country?: string },
  countryCode: string,
): string {
  const { street, city, state, postal_code, country } = parts;
  const pieces: string[] = [];
  if (street) pieces.push(street);

  switch (countryCode) {
    case 'US':
      if (city || state || postal_code) {
        pieces.push(
          [city, state].filter(Boolean).join(', ') + (postal_code ? ` ${postal_code}` : ''),
        );
      }
      break;
    case 'BR':
      if (city || state) pieces.push([city, state].filter(Boolean).join(' - '));
      if (postal_code) pieces.push(`CEP ${postal_code}`);
      break;
    default:
      if (postal_code || city) pieces.push([postal_code, city].filter(Boolean).join(' '));
      if (state) pieces.push(state);
  }
  if (country) pieces.push(country);
  return pieces.filter(Boolean).join(', ');
}

export function formatPhone(phone: string, countryCode: string): string {
  const digits = phone.replace(/\D/g, '');
  switch (countryCode) {
    case 'MX':
      if (digits.length === 10) {
        return `+52 ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
      }
      break;
    case 'US':
      if (digits.length === 10) {
        return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      break;
    case 'CO':
      if (digits.length === 10) {
        return `+57 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
      }
      break;
    case 'AR':
      if (digits.length >= 10) {
        return `+54 ${digits.slice(0, -8)} ${digits.slice(-8, -4)}-${digits.slice(-4)}`;
      }
      break;
    case 'BR':
      if (digits.length === 11) {
        return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      }
      break;
  }
  return phone;
}
