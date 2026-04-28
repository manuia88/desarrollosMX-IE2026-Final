// FASE 14.1 — Dubai i18n keys (ADR-059 §Step 6).
// Tier 1 H1: en-US (primary Dubai mercado global) + es-MX (secondary DMX nativo).
// Tier 2 H2: ar-AE pendiente flag DUBAI_FULL_LOCALE_AR_AE activación.
// Consumido en messages/<locale>.json — emitidos como const para sub-agent 5 mergear.

export const DUBAI_I18N_EN_US = {
  'Cities.dubai.name': 'Dubai',
  'Cities.dubai.heroTitle': 'Real estate investment in Dubai',
  'Cities.dubai.heroSubtitle': 'Tier H1 synthetic data + Reelly STUB pending API key.',
  'Cities.dubai.kpiTitle': 'Top 5 zones KPIs',
  'Cities.dubai.mapTitle': 'Key zones map',
  'Cities.dubai.ctaPrimary': 'Coming soon',
  'Cities.dubai.disclaimer':
    'Synthetic data H1. Real ingestion via Reelly API H2 (pending API key).',
  'Cities.dubai.zonesLabel': 'Key zones',
  'Cities.dubai.synthBadge': 'Synthetic data H1',
  'Cities.dubai.comingSoonBadge': 'Coming soon — Reelly integration H2',
  'Cities.dubai.priceUsdLabel': 'USD',
  'Cities.dubai.priceAedLabel': 'AED',
} as const;

export const DUBAI_I18N_ES_MX = {
  'Cities.dubai.name': 'Dubái',
  'Cities.dubai.heroTitle': 'Inversión inmobiliaria en Dubái',
  'Cities.dubai.heroSubtitle': 'Datos sintéticos H1 + integración Reelly pendiente API key.',
  'Cities.dubai.kpiTitle': 'KPIs top 5 zonas',
  'Cities.dubai.mapTitle': 'Mapa de zonas clave',
  'Cities.dubai.ctaPrimary': 'Próximamente',
  'Cities.dubai.disclaimer':
    'Datos sintéticos H1. Ingesta real vía Reelly API H2 (API key pendiente).',
  'Cities.dubai.zonesLabel': 'Zonas clave',
  'Cities.dubai.synthBadge': 'Datos sintéticos H1',
  'Cities.dubai.comingSoonBadge': 'Próximamente — integración Reelly H2',
  'Cities.dubai.priceUsdLabel': 'USD',
  'Cities.dubai.priceAedLabel': 'AED',
} as const;

export type DubaiI18nKey = keyof typeof DUBAI_I18N_EN_US;
