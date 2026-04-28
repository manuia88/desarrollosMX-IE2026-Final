// FASE 14.1 — Guadalajara city expansion (ADR-059 §Step 4).
// i18n keys emitidas como const — merge a messages/{es-MX,en-US}.json en sub-fase de wiring i18n.
// Tier 1 active: es-MX + en-US (canon ADR-051). Tier 2 H2 fallback es-MX/en-US.

export const GDL_I18N_ES_MX: Readonly<Record<string, string>> = {
  'Cities.guadalajara.name': 'Guadalajara',
  'Cities.guadalajara.heroTitle': 'Inversión inmobiliaria en Guadalajara',
  'Cities.guadalajara.heroSubtitle':
    'Datos sintéticos Tier H1, ingestion real H2. Primer hub financiero del Bajío + Andares ecosystem.',
  'Cities.guadalajara.kpiTitle': 'KPIs Top 5 zonas',
  'Cities.guadalajara.mapTitle': 'Mapa de zonas clave',
  'Cities.guadalajara.ctaPrimary': 'Explorar desarrollos',
  'Cities.guadalajara.disclaimer':
    'Datos sintéticos H1 publicados con disclosure ADR-018. Reemplazo automático cuando ingestion real esté lista H2.',
  'Cities.guadalajara.zonesLabel': 'Zonas key',
  'Cities.guadalajara.synthBadge': 'Datos sintéticos H1',
};

export const GDL_I18N_EN_US: Readonly<Record<string, string>> = {
  'Cities.guadalajara.name': 'Guadalajara',
  'Cities.guadalajara.heroTitle': 'Real estate investment in Guadalajara',
  'Cities.guadalajara.heroSubtitle':
    'Synthetic Tier H1 data, real ingestion H2. Mexico Bajio financial hub + Andares ecosystem.',
  'Cities.guadalajara.kpiTitle': 'Top 5 zones KPIs',
  'Cities.guadalajara.mapTitle': 'Key zones map',
  'Cities.guadalajara.ctaPrimary': 'Explore developments',
  'Cities.guadalajara.disclaimer':
    'Synthetic H1 data shipped with ADR-018 disclosure. Auto-replaced when real ingestion ships H2.',
  'Cities.guadalajara.zonesLabel': 'Key zones',
  'Cities.guadalajara.synthBadge': 'Synthetic H1 data',
};
