// ADR-059 — Querétaro city expansion (FASE 14.1) — Paso 4: i18n keys Tier 1.
// Sub-agente 5 mergea estas keys a messages/{es-MX,en-US}.json bajo namespace `Cities.queretaro`.
// Tier 2 (es-CO/es-AR/pt-BR/ar-AE) → fallback graceful canon ADR-051.

import type { QroI18nKeys } from './types';

export const QRO_I18N_ES_MX: QroI18nKeys = {
  name: 'Querétaro',
  heroTitle: 'Querétaro: el hub emergente de Bajío',
  heroSubtitle:
    'Inteligencia inmobiliaria en tiempo real para Juriquilla, El Refugio, Centro Histórico y más. Métricas de pulso, futuros y oportunidad ghost por zona.',
  kpiTitle: 'Indicadores clave por zona',
  mapTitle: 'Mapa interactivo Querétaro',
  ctaPrimary: 'Explorar inteligencia Querétaro',
  disclaimer:
    'Datos sintéticos H1 con disclosure transparente. Fuentes reales en migración H2 (canon ADR-018).',
  zonesLabel: 'Zonas',
  synthBadge: 'Datos sintéticos · ADR-059',
};

export const QRO_I18N_EN_US: QroI18nKeys = {
  name: 'Querétaro',
  heroTitle: 'Querétaro: the emerging Bajío hub',
  heroSubtitle:
    'Real-time real-estate intelligence for Juriquilla, El Refugio, Historic Downtown and more. Pulse, futures and ghost-opportunity metrics per zone.',
  kpiTitle: 'Key indicators per zone',
  mapTitle: 'Interactive Querétaro map',
  ctaPrimary: 'Explore Querétaro intelligence',
  disclaimer:
    'Synthetic H1 data with transparent disclosure. Real sources migrating H2 (ADR-018 canon).',
  zonesLabel: 'Zones',
  synthBadge: 'Synthetic data · ADR-059',
};

export const QRO_I18N_NAMESPACE = 'Cities.queretaro' as const;

export function getQroI18n(locale: string): QroI18nKeys {
  if (locale === 'en-US') return QRO_I18N_EN_US;
  return QRO_I18N_ES_MX;
}
