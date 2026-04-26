import { describe, expect, it } from 'vitest';
import type { IngestCtx } from '../../types';
import {
  CATASTRO_CDMX_FEATURE_FLAG,
  CatastroCdmxNotImplementedError,
  catastroCdmxDriver,
  ingestCatastroCdmx,
} from '../catastro-cdmx';
import { INAH_FEATURE_FLAG, InahNotImplementedError, inahDriver, ingestInah } from '../inah';
import {
  ingestLocatel,
  LOCATEL_FEATURE_FLAG,
  LocatelNotImplementedError,
  locatelDriver,
} from '../locatel';
import {
  ingestMapboxTraffic,
  MAPBOX_TRAFFIC_ESTIMATED_COST_USD_PER_CALL,
  MAPBOX_TRAFFIC_FEATURE_FLAG,
  MapboxTrafficNotImplementedError,
  mapboxTrafficDriver,
} from '../mapbox-traffic';
import { ingestPaot, PAOT_FEATURE_FLAG, PaotNotImplementedError, paotDriver } from '../paot';
import {
  ingestProfeco,
  PROFECO_FEATURE_FLAG,
  ProfecoNotImplementedError,
  profecoDriver,
} from '../profeco';
import {
  ingestRama,
  RAMA_FEATURE_FLAG,
  RamaNotImplementedError,
  ramaDriver,
} from '../rama-sinaica';
import {
  ingestSedema,
  SEDEMA_FEATURE_FLAG,
  SedemaNotImplementedError,
  sedemaDriver,
} from '../sedema';
import {
  ingestSeduvi,
  SEDUVI_FEATURE_FLAG,
  SeduviNotImplementedError,
  seduviDriver,
} from '../seduvi';

function mockCtx(source: string): IngestCtx {
  return {
    runId: 'r-stub',
    source,
    countryCode: 'MX',
    samplePercentage: 100,
    triggeredBy: null,
    startedAt: new Date(),
  };
}

describe('GEO H2 stubs (ADR-018 compliant)', () => {
  it('rama stub: driver registered, category=geo/daily, throws canonical error', async () => {
    expect(ramaDriver.source).toBe('rama');
    expect(ramaDriver.category).toBe('geo');
    expect(ramaDriver.defaultPeriodicity).toBe('daily');
    expect(RAMA_FEATURE_FLAG).toBe('ingest.rama.enabled');
    await expect(ramaDriver.fetch(mockCtx('rama'), undefined)).rejects.toThrow(
      'rama_sinaica_not_implemented_h2',
    );
    await expect(ingestRama()).rejects.toBeInstanceOf(RamaNotImplementedError);
  });

  it('seduvi stub: driver registered, category=geo/yearly, throws canonical error', async () => {
    expect(seduviDriver.source).toBe('seduvi');
    expect(seduviDriver.category).toBe('geo');
    expect(seduviDriver.defaultPeriodicity).toBe('yearly');
    expect(SEDUVI_FEATURE_FLAG).toBe('ingest.seduvi.enabled');
    await expect(seduviDriver.fetch(mockCtx('seduvi'), undefined)).rejects.toThrow(
      'seduvi_not_implemented_h2',
    );
    await expect(ingestSeduvi()).rejects.toBeInstanceOf(SeduviNotImplementedError);
  });

  it('catastro_cdmx stub: driver registered, category=geo/yearly, throws canonical error', async () => {
    expect(catastroCdmxDriver.source).toBe('catastro_cdmx');
    expect(catastroCdmxDriver.category).toBe('geo');
    expect(catastroCdmxDriver.defaultPeriodicity).toBe('yearly');
    expect(CATASTRO_CDMX_FEATURE_FLAG).toBe('ingest.catastro_cdmx.enabled');
    await expect(catastroCdmxDriver.fetch(mockCtx('catastro_cdmx'), undefined)).rejects.toThrow(
      'catastro_cdmx_not_implemented_h2',
    );
    await expect(ingestCatastroCdmx()).rejects.toBeInstanceOf(CatastroCdmxNotImplementedError);
  });

  it('paot stub: driver registered, category=geo/monthly, throws canonical error', async () => {
    expect(paotDriver.source).toBe('paot');
    expect(paotDriver.category).toBe('geo');
    expect(paotDriver.defaultPeriodicity).toBe('monthly');
    expect(PAOT_FEATURE_FLAG).toBe('ingest.paot.enabled');
    await expect(paotDriver.fetch(mockCtx('paot'), undefined)).rejects.toThrow(
      'paot_not_implemented_h2',
    );
    await expect(ingestPaot()).rejects.toBeInstanceOf(PaotNotImplementedError);
  });

  it('sedema stub: driver registered, category=geo/daily, throws canonical error', async () => {
    expect(sedemaDriver.source).toBe('sedema');
    expect(sedemaDriver.category).toBe('geo');
    expect(sedemaDriver.defaultPeriodicity).toBe('daily');
    expect(SEDEMA_FEATURE_FLAG).toBe('ingest.sedema.enabled');
    await expect(sedemaDriver.fetch(mockCtx('sedema'), undefined)).rejects.toThrow(
      'sedema_not_implemented_h2',
    );
    await expect(ingestSedema()).rejects.toBeInstanceOf(SedemaNotImplementedError);
  });

  it('inah stub: driver registered, category=geo/yearly, throws canonical error', async () => {
    expect(inahDriver.source).toBe('inah');
    expect(inahDriver.category).toBe('geo');
    expect(inahDriver.defaultPeriodicity).toBe('yearly');
    expect(INAH_FEATURE_FLAG).toBe('ingest.inah.enabled');
    await expect(inahDriver.fetch(mockCtx('inah'), undefined)).rejects.toThrow(
      'inah_not_implemented_h2',
    );
    await expect(ingestInah()).rejects.toBeInstanceOf(InahNotImplementedError);
  });

  it('profeco stub: driver registered, category=geo/monthly, throws canonical error', async () => {
    expect(profecoDriver.source).toBe('profeco');
    expect(profecoDriver.category).toBe('geo');
    expect(profecoDriver.defaultPeriodicity).toBe('monthly');
    expect(PROFECO_FEATURE_FLAG).toBe('ingest.profeco.enabled');
    await expect(profecoDriver.fetch(mockCtx('profeco'), undefined)).rejects.toThrow(
      'profeco_not_implemented_h2',
    );
    await expect(ingestProfeco()).rejects.toBeInstanceOf(ProfecoNotImplementedError);
  });

  it('locatel stub: driver registered, category=geo/weekly, throws canonical error', async () => {
    expect(locatelDriver.source).toBe('locatel');
    expect(locatelDriver.category).toBe('geo');
    expect(locatelDriver.defaultPeriodicity).toBe('weekly');
    expect(LOCATEL_FEATURE_FLAG).toBe('ingest.locatel.enabled');
    await expect(locatelDriver.fetch(mockCtx('locatel'), undefined)).rejects.toThrow(
      'locatel_not_implemented_h2',
    );
    await expect(ingestLocatel()).rejects.toBeInstanceOf(LocatelNotImplementedError);
  });

  it('mapbox_traffic stub: driver registered, category=geo/on_demand, throws canonical error, cost constant exported', async () => {
    expect(mapboxTrafficDriver.source).toBe('mapbox_traffic');
    expect(mapboxTrafficDriver.category).toBe('geo');
    expect(mapboxTrafficDriver.defaultPeriodicity).toBe('on_demand');
    expect(MAPBOX_TRAFFIC_FEATURE_FLAG).toBe('ingest.mapbox_traffic.enabled');
    expect(MAPBOX_TRAFFIC_ESTIMATED_COST_USD_PER_CALL).toBeGreaterThan(0);
    await expect(mapboxTrafficDriver.fetch(mockCtx('mapbox_traffic'), undefined)).rejects.toThrow(
      'mapbox_traffic_not_implemented_h2',
    );
    await expect(ingestMapboxTraffic()).rejects.toBeInstanceOf(MapboxTrafficNotImplementedError);
  });
});
