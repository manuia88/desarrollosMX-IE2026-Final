// ADR-059 — Playa del Carmen i18n keys
// FASE 14.1 sub-agent 1
// Keys exportados como const literal — orchestrator merge final a messages/<locale>.json
// (sub-agent 1 NO toca messages/* directly per scope isolation).

export const PLAYA_I18N_ES_MX: Readonly<Record<string, string>> = {
  'Cities.playaDelCarmen.name': 'Playa del Carmen',
  'Cities.playaDelCarmen.heroTitle': 'Inversión inmobiliaria en Playa del Carmen',
  'Cities.playaDelCarmen.heroSubtitle': 'Datos sintéticos Tier H1, ingestion real H2.',
  'Cities.playaDelCarmen.kpiTitle': 'KPIs Top 5 zonas',
  'Cities.playaDelCarmen.mapTitle': 'Mapa de zonas clave',
  'Cities.playaDelCarmen.ctaPrimary': 'Explorar desarrollos',
  'Cities.playaDelCarmen.disclaimer':
    'Datos sintéticos H1. Activación ingestion real H2 con sources catastrales locales.',
  'Cities.playaDelCarmen.zonesLabel': 'Zonas key',
  'Cities.playaDelCarmen.synthBadge': 'Datos sintéticos H1',
};

export const PLAYA_I18N_EN_US: Readonly<Record<string, string>> = {
  'Cities.playaDelCarmen.name': 'Playa del Carmen',
  'Cities.playaDelCarmen.heroTitle': 'Real estate investment in Playa del Carmen',
  'Cities.playaDelCarmen.heroSubtitle': 'Tier H1 synthetic data, real ingestion H2.',
  'Cities.playaDelCarmen.kpiTitle': 'Top 5 zones KPIs',
  'Cities.playaDelCarmen.mapTitle': 'Key zones map',
  'Cities.playaDelCarmen.ctaPrimary': 'Explore developments',
  'Cities.playaDelCarmen.disclaimer':
    'Synthetic data H1. Real ingestion H2 with local cadastral sources.',
  'Cities.playaDelCarmen.zonesLabel': 'Key zones',
  'Cities.playaDelCarmen.synthBadge': 'Synthetic data H1',
};
