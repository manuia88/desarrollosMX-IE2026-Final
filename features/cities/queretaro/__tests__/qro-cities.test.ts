// ADR-059 — Querétaro city expansion (FASE 14.1) — Modo A test suite (CI-fast).
// 8 tests obligatorios: zones count + country/parent + lat/lng range + 4 score types
// + ranges valid + provenance + i18n parity + index re-exports.

import { describe, expect, it } from 'vitest';
import {
  calculateQueretaroIEScores,
  getQroI18n,
  getQueretaroScoreRange,
  isQroZoneScopeId,
  QRO_COUNTRY_CODE,
  QRO_I18N_EN_US,
  QRO_I18N_ES_MX,
  QRO_PARENT_SCOPE_ID,
  QRO_ZONES_CANON,
} from '../index';
import type { QroScoreType } from '../types';

describe('Querétaro city expansion — ADR-059', () => {
  it('declara 7 zonas key Querétaro', () => {
    expect(QRO_ZONES_CANON).toHaveLength(7);
    const scopeIds = QRO_ZONES_CANON.map((z) => z.scopeId);
    expect(new Set(scopeIds).size).toBe(7);
  });

  it('todas las zonas tienen country MX y parent_scope_id queretaro', () => {
    expect(QRO_COUNTRY_CODE).toBe('MX');
    expect(QRO_PARENT_SCOPE_ID).toBe('queretaro');
    for (const zone of QRO_ZONES_CANON) {
      expect(isQroZoneScopeId(zone.scopeId)).toBe(true);
      expect(zone.scopeId.startsWith('mx-queretaro-')).toBe(true);
    }
  });

  it('coordenadas dentro de bounding box Querétaro (lat 20.5-20.8, lng -100.5..-100.3)', () => {
    for (const zone of QRO_ZONES_CANON) {
      expect(zone.lat).toBeGreaterThanOrEqual(20.5);
      expect(zone.lat).toBeLessThanOrEqual(20.8);
      expect(zone.lng).toBeGreaterThanOrEqual(-100.5);
      expect(zone.lng).toBeLessThanOrEqual(-100.3);
    }
  });

  it('expone los 4 score types canon (pulse, futures, ghost, alpha) per zona', () => {
    const scores = calculateQueretaroIEScores();
    expect(scores).toHaveLength(7 * 4);
    const scoreTypes = new Set(scores.map((s) => s.scoreType));
    expect(scoreTypes).toEqual(new Set<QroScoreType>(['pulse', 'futures', 'ghost', 'alpha']));
    for (const zone of QRO_ZONES_CANON) {
      const zoneScores = scores.filter((s) => s.scopeId === zone.scopeId);
      expect(zoneScores).toHaveLength(4);
    }
  });

  it('todos los scores caen dentro de los ranges canon QRO', () => {
    const ranges = {
      pulse: getQueretaroScoreRange('pulse'),
      futures: getQueretaroScoreRange('futures'),
      ghost: getQueretaroScoreRange('ghost'),
      alpha: getQueretaroScoreRange('alpha'),
    } as const;
    expect(ranges.pulse).toEqual({ min: 78, max: 93 });
    expect(ranges.futures).toEqual({ min: 70, max: 88 });
    expect(ranges.ghost).toEqual({ min: 5, max: 22 });
    expect(ranges.alpha).toEqual({ min: 62, max: 82 });
    const scores = calculateQueretaroIEScores();
    for (const s of scores) {
      const r = ranges[s.scoreType];
      expect(s.scoreValue).toBeGreaterThanOrEqual(r.min);
      expect(s.scoreValue).toBeLessThanOrEqual(r.max);
    }
  });

  it('provenance is_synthetic=true + adr ADR-059 en todos los scores', () => {
    const scores = calculateQueretaroIEScores();
    for (const s of scores) {
      expect(s.provenance.is_synthetic).toBe(true);
      expect(s.provenance.adr).toBe('ADR-059');
      expect(s.provenance.source).toBe('fase-14.1-expansion');
      expect(typeof s.provenance.note).toBe('string');
    }
  });

  it('i18n parity es-MX vs en-US (mismas keys, valores no vacíos)', () => {
    const esKeys = Object.keys(QRO_I18N_ES_MX).toSorted();
    const enKeys = Object.keys(QRO_I18N_EN_US).toSorted();
    expect(esKeys).toEqual(enKeys);
    for (const key of esKeys) {
      const esVal = QRO_I18N_ES_MX[key as keyof typeof QRO_I18N_ES_MX];
      const enVal = QRO_I18N_EN_US[key as keyof typeof QRO_I18N_EN_US];
      expect(esVal.length).toBeGreaterThan(0);
      expect(enVal.length).toBeGreaterThan(0);
    }
    expect(getQroI18n('es-MX')).toEqual(QRO_I18N_ES_MX);
    expect(getQroI18n('en-US')).toEqual(QRO_I18N_EN_US);
    expect(getQroI18n('pt-BR')).toEqual(QRO_I18N_ES_MX); // fallback graceful
  });

  it('index re-exporta API canon QRO completa', async () => {
    const mod = await import('../index');
    expect(typeof mod.loadQueretaroZones).toBe('function');
    expect(typeof mod.calculateQueretaroIEScores).toBe('function');
    expect(typeof mod.getQueretaroScoreRange).toBe('function');
    expect(typeof mod.getQroI18n).toBe('function');
    expect(typeof mod.isQroZoneScopeId).toBe('function');
    expect(mod.QRO_ZONES_CANON).toBeDefined();
    expect(mod.QRO_PARENT_SCOPE_ID).toBe('queretaro');
    expect(mod.QRO_COUNTRY_CODE).toBe('MX');
    expect(mod.QRO_SCOPE_TYPE).toBe('zona');
    expect(mod.QRO_I18N_NAMESPACE).toBe('Cities.queretaro');
    expect(mod.QRO_I18N_ES_MX).toBeDefined();
    expect(mod.QRO_I18N_EN_US).toBeDefined();
  });
});
