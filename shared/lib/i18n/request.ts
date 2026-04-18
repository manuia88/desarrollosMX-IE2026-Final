import { getRequestConfig } from 'next-intl/server';
import { COUNTRY_DEFAULT_TIMEZONE, defaultLocale, isLocale, localeToCountry } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : defaultLocale;
  const country = localeToCountry[locale];
  const timeZone = COUNTRY_DEFAULT_TIMEZONE[country] ?? 'America/Mexico_City';

  return {
    locale,
    timeZone,
    messages: (await import(`../../../messages/${locale}.json`)).default,
  };
});
