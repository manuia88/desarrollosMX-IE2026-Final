// ADR-059 — Querétaro city expansion (FASE 14.1)
// Tipos canónicos del módulo. Reuse zones master polymorphic + zone_scores schema existing.

export type QroZoneScopeId =
  | 'mx-queretaro-centro-historico'
  | 'mx-queretaro-juriquilla'
  | 'mx-queretaro-el-refugio'
  | 'mx-queretaro-cumbres-del-lago'
  | 'mx-queretaro-real-de-juriquilla'
  | 'mx-queretaro-milenio-iii'
  | 'mx-queretaro-antigua-hacienda';

export interface QroZoneCanon {
  readonly scopeId: QroZoneScopeId;
  readonly nameEs: string;
  readonly nameEn: string;
  readonly lat: number;
  readonly lng: number;
}

export type QroScoreType = 'pulse' | 'futures' | 'ghost' | 'alpha';

export interface QroIEScore {
  readonly scopeId: QroZoneScopeId;
  readonly scoreType: QroScoreType;
  readonly scoreValue: number;
  readonly provenance: QroScoreProvenance;
}

export interface QroScoreProvenance {
  readonly is_synthetic: true;
  readonly adr: 'ADR-059';
  readonly source: 'fase-14.1-expansion';
  readonly note: string;
}

export interface QroI18nKeys {
  readonly name: string;
  readonly heroTitle: string;
  readonly heroSubtitle: string;
  readonly kpiTitle: string;
  readonly mapTitle: string;
  readonly ctaPrimary: string;
  readonly disclaimer: string;
  readonly zonesLabel: string;
  readonly synthBadge: string;
}
