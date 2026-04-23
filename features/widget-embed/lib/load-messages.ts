// Static locale → messages mapping para rutas /embed/*.
// Turbopack no resuelve dynamic imports con template strings en app router;
// usamos imports estáticos explícitos y seleccionamos por locale en runtime.

import enUS from '@/messages/en-US.json';
import esAR from '@/messages/es-AR.json';
import esCO from '@/messages/es-CO.json';
import esMX from '@/messages/es-MX.json';
import ptBR from '@/messages/pt-BR.json';
import { defaultLocale, isLocale, type Locale } from '@/shared/lib/i18n/config';

const MESSAGES_BY_LOCALE: Readonly<Record<Locale, Record<string, unknown>>> = Object.freeze({
  'es-MX': esMX as Record<string, unknown>,
  'es-CO': esCO as Record<string, unknown>,
  'es-AR': esAR as Record<string, unknown>,
  'pt-BR': ptBR as Record<string, unknown>,
  'en-US': enUS as Record<string, unknown>,
});

export function resolveEmbedLocale(raw: string | undefined): Locale {
  if (!raw) return defaultLocale;
  return isLocale(raw) ? raw : defaultLocale;
}

export function getEmbedMessages(locale: string): Record<string, unknown> {
  const resolved = resolveEmbedLocale(locale);
  return MESSAGES_BY_LOCALE[resolved];
}
